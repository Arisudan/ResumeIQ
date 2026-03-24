from io import BytesIO
import logging
import time
from typing import Annotated

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth import create_access_token, current_user_from_auth_header, hash_password, require_current_user, verify_password
from exporter import export_to_docx
from optimizer import generate_cover_letter, optimize_resume
from parser import parse_docx_with_diagnostics, parse_pdf_with_diagnostics
from scorer import analyze_multi_target, analyze_resume as analyze_resume_text, score_ats
from storage import create_audit_log, create_user, get_user_by_email, init_db, list_audit_logs, list_user_runs, save_resume_run

load_dotenv()

app = FastAPI(title="ResumeIQ API", version="1.0.0")

logger = logging.getLogger("resumeiq")
logging.basicConfig(level=logging.INFO)

MAX_UPLOAD_BYTES = 6 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DownloadRequest(BaseModel):
    optimized_resume: str


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class MultiAnalyzeRequest(BaseModel):
    resume_text: str
    job_descriptions: list[str]
    linkedin_text: str | None = None
    role_template: str = "software"
    region_style: str = "US"


class CoverLetterRequest(BaseModel):
    resume_text: str
    job_description: str
    tone: str = "professional"
    region_style: str = "US"
    language: str = "English"


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.middleware("http")
async def telemetry_middleware(request: Request, call_next):
    start = time.perf_counter()
    user_id = None
    status = "ok"
    error_message = None

    try:
        user = current_user_from_auth_header(request.headers.get("Authorization"))
        user_id = user["id"] if user else None
    except HTTPException:
        user_id = None

    try:
        response = await call_next(request)
        if response.status_code >= 400:
            status = "error"
        return response
    except Exception as exc:
        status = "error"
        error_message = str(exc)
        raise
    finally:
        latency_ms = int((time.perf_counter() - start) * 1000)
        action = f"{request.method} {request.url.path}"
        create_audit_log(
            action=action,
            status=status,
            latency_ms=latency_ms,
            user_id=user_id,
            error_message=error_message,
        )
        logger.info("request action=%s status=%s latency_ms=%s user_id=%s", action, status, latency_ms, user_id)


@app.post("/auth/register")
def register(payload: RegisterRequest) -> dict:
    email = payload.email.lower().strip()
    password = payload.password.strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if get_user_by_email(email):
        raise HTTPException(status_code=400, detail="User already exists.")

    user = create_user(email=email, password_hash=hash_password(password))
    token = create_access_token(user_id=user["id"], email=user["email"], role=user["role"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "role": user["role"]},
    }


@app.post("/auth/login")
def login(payload: LoginRequest) -> dict:
    user = get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user_id=user["id"], email=user["email"], role=user["role"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "role": user["role"]},
    }


@app.get("/me")
def me(request: Request) -> dict:
    user = require_current_user(request.headers.get("Authorization"))
    return {"id": user["id"], "email": user["email"], "role": user["role"], "created_at": user["created_at"]}


@app.get("/history")
def history(request: Request, limit: int = 20) -> dict:
    user = require_current_user(request.headers.get("Authorization"))
    runs = list_user_runs(user_id=user["id"], limit=limit)
    return {"items": runs}


@app.get("/admin/audit-logs")
def audit_logs(request: Request, limit: int = 100) -> dict:
    user = require_current_user(request.headers.get("Authorization"))
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return {"items": list_audit_logs(limit=limit)}


def _validate_upload(resume_file: UploadFile, file_bytes: bytes) -> None:
    filename = (resume_file.filename or "").lower()
    if not filename:
        raise HTTPException(status_code=400, detail="Resume file name is missing.")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Maximum allowed size is 6 MB.")
    if resume_file.content_type and resume_file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported content-type. Please upload PDF or DOCX only.")
    if not (filename.endswith(".pdf") or filename.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a PDF or DOCX file.")


@app.post("/analyze")
async def analyze_resume_endpoint(
    request: Request,
    resume_file: UploadFile = File(...),
    job_description: str = Form(...),
    linkedin_text: str = Form(default=""),
    additional_job_descriptions: str = Form(default=""),
    role_template: str = Form(default="software"),
    tone: str = Form(default="professional"),
    length_mode: str = Form(default="balanced"),
    target_seniority: str = Form(default="auto"),
    strictness: str = Form(default="strict"),
    region_style: str = Form(default="US"),
    language: str = Form(default="English"),
) -> dict:
    try:
        file_bytes = await resume_file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        _validate_upload(resume_file, file_bytes)

        filename = (resume_file.filename or "").lower()

        parser_diagnostics = {"warnings": []}
        if filename.endswith(".pdf"):
            resume_text, parser_diagnostics = parse_pdf_with_diagnostics(file_bytes)
        elif filename.endswith(".docx"):
            resume_text, parser_diagnostics = parse_docx_with_diagnostics(file_bytes)
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload a PDF or DOCX file.",
            )

        ats_result = analyze_resume_text(
            resume_text=resume_text,
            job_description=job_description,
            linkedin_text=linkedin_text,
            role_template=role_template,
            region_style=region_style,
        )
        optimization = await optimize_resume(
            resume_text=resume_text,
            job_description=job_description,
            missing_keywords=ats_result["missing"],
            tone=tone,
            length_mode=length_mode,
            target_seniority=target_seniority,
            strictness=strictness,
            role_template=role_template,
            region_style=region_style,
            language=language,
        )

        optimized_score_result = score_ats(
            resume_text=optimization["optimized_resume"],
            job_description=job_description,
        )

        response_payload = {
            "score": ats_result["score"],
            "matched_keywords": ats_result["matched"],
            "missing_keywords": ats_result["missing"],
            "total_job_keywords": ats_result["total_job_keywords"],
            "required_keywords": ats_result["required_keywords"],
            "missing_required_keywords": ats_result["missing_required"],
            "section_scores": ats_result["section_scores"],
            "bullet_quality": ats_result["bullet_quality"],
            "keyword_placement": ats_result["keyword_placement"],
            "role_alignment": ats_result["role_alignment"],
            "experience_gap": ats_result["experience_gap"],
            "contact_checks": ats_result["contact_checks"],
            "readability": ats_result["readability"],
            "truthfulness_flags": ats_result["truthfulness_flags"],
            "linkedin_alignment": ats_result["linkedin_alignment"],
            "language": ats_result["language"],
            "regional_style": ats_result["regional_style"],
            "template_alignment": ats_result["template_alignment"],
            "ats_factor_breakdown": ats_result["ats_factor_breakdown"],
            "recommendations": ats_result["recommendations"],
            "analysis_version": ats_result["analysis_version"],
            "parser_diagnostics": parser_diagnostics,
            "score_improvement_estimate": {
                "before": ats_result["score"],
                "after": optimized_score_result["score"],
                "delta": optimized_score_result["score"] - ats_result["score"],
            },
            "optimized_resume": optimization["optimized_resume"],
            "changes_summary": optimization["changes_summary"],
            "change_reasons": optimization.get("change_reasons", []),
            "truthfulness_notes": optimization.get("truthfulness_notes", []),
            "job_description_used": job_description,
            "rewrite_controls": {
                "role_template": role_template,
                "tone": tone,
                "length_mode": length_mode,
                "target_seniority": target_seniority,
                "strictness": strictness,
                "region_style": region_style,
                "language": language,
            },
            "multi_job_preview": analyze_multi_target(
                resume_text=resume_text,
                job_descriptions=[job_description]
                + [segment.strip() for segment in additional_job_descriptions.split("\n---\n") if segment.strip()],
                linkedin_text=linkedin_text,
                role_template=role_template,
                region_style=region_style,
            )
            if additional_job_descriptions.strip()
            else None,
        }

        user = current_user_from_auth_header(request.headers.get("Authorization"))
        if user:
            save_resume_run(
                user_id=user["id"],
                filename=resume_file.filename or "resume",
                score=response_payload["score"],
                analysis_payload=response_payload,
                optimized_resume=response_payload["optimized_resume"],
            )

        return response_payload
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {exc}") from exc


@app.post("/analyze-multi")
def analyze_multi(payload: MultiAnalyzeRequest) -> dict:
    try:
        return analyze_multi_target(
            resume_text=payload.resume_text,
            job_descriptions=payload.job_descriptions,
            linkedin_text=payload.linkedin_text,
            role_template=payload.role_template,
            region_style=payload.region_style,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to run multi-job analysis: {exc}") from exc


@app.post("/cover-letter")
async def cover_letter(payload: CoverLetterRequest) -> dict:
    try:
        return await generate_cover_letter(
            resume_text=payload.resume_text,
            job_description=payload.job_description,
            tone=payload.tone,
            region_style=payload.region_style,
            language=payload.language,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate cover letter: {exc}") from exc


@app.post("/download")
def download_resume(payload: DownloadRequest):
    if not payload.optimized_resume.strip():
        raise HTTPException(status_code=400, detail="optimized_resume cannot be empty.")

    try:
        docx_bytes = export_to_docx(payload.optimized_resume)
        return StreamingResponse(
            BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": "attachment; filename=optimized_resume.docx",
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate DOCX: {exc}") from exc
