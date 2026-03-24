import json
import os
import re
from typing import Any

from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()


WEAK_PHRASE_REPLACEMENTS = {
    "responsible for": "Led",
    "worked on": "Delivered",
    "helped": "Contributed to",
    "assisted": "Supported",
    "involved in": "Drove",
}


def _rewrite_bullet(line: str) -> str:
    text = re.sub(r"^\s*[\-\*•]\s*", "", line).strip()
    if not text:
        return ""

    lowered = text.lower()
    for weak, strong in WEAK_PHRASE_REPLACEMENTS.items():
        if lowered.startswith(weak):
            text = strong + text[len(weak) :]
            break

    if text and text[0].islower():
        text = text[0].upper() + text[1:]

    return f"• {text}"


def _fallback_optimize_resume(
    resume_text: str,
    job_description: str,
    missing_keywords: list[str],
    reason: str,
) -> dict:
    lines = resume_text.splitlines()
    rewritten_lines = []
    bullet_rewrites = 0

    for line in lines:
        stripped = line.strip()
        if not stripped:
            rewritten_lines.append("")
            continue

        if re.match(r"^\s*[\-\*•]\s+", line):
            rewritten = _rewrite_bullet(line)
            rewritten_lines.append(rewritten if rewritten else stripped)
            bullet_rewrites += 1
        else:
            rewritten_lines.append(stripped)

    keyword_list = [k for k in missing_keywords if isinstance(k, str) and k.strip()]
    prioritized = keyword_list[:15]

    if prioritized:
        rewritten_lines.append("")
        rewritten_lines.append("ATS KEYWORDS TO INTEGRATE:")
        rewritten_lines.extend([f"• {keyword}" for keyword in prioritized])

    jd_terms = re.findall(r"[A-Za-z][A-Za-z0-9+/.-]{2,}", job_description)
    top_jd_terms = []
    seen = set()
    for term in jd_terms:
        key = term.lower()
        if key in seen:
            continue
        seen.add(key)
        top_jd_terms.append(term)
        if len(top_jd_terms) >= 8:
            break

    rewritten_lines.append("")
    rewritten_lines.append("TARGET ROLE ALIGNMENT:")
    if top_jd_terms:
        rewritten_lines.append("• Prioritized role language: " + ", ".join(top_jd_terms))
    else:
        rewritten_lines.append("• Prioritized role language from the provided job description.")

    changes_summary = [
        f"Applied local fallback optimization because AI service was unavailable ({reason}).",
        f"Rewrote {bullet_rewrites} bullet points with stronger action-led phrasing.",
        "Preserved original resume sections and overall structure.",
        "Generated a prioritized ATS keyword list for targeted integration.",
        "Added job-description alignment hints to guide final manual polishing.",
    ]

    change_reasons = [
        {
            "change": "Strengthened weak bullet openings",
            "reason": "Action verbs increase recruiter readability and ATS context clarity.",
        },
        {
            "change": "Added keyword integration section",
            "reason": "Helps place missing terms naturally in relevant sections.",
        },
        {
            "change": "Preserved factual content",
            "reason": "Avoids introducing unverified claims during fallback rewriting.",
        },
    ]

    return {
        "optimized_resume": "\n".join(rewritten_lines).strip(),
        "changes_summary": changes_summary,
        "change_reasons": change_reasons,
        "truthfulness_notes": [
            "Fallback optimizer does not invent companies, dates, titles, or metrics.",
            "Review every quantified claim before sharing the resume externally.",
        ],
    }


def _is_recoverable_api_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return (
        "insufficient_quota" in message
        or "quota" in message
        or "rate limit" in message
        or "error code: 429" in message
        or "invalid_api_key" in message
        or "incorrect api key" in message
        or "error code: 401" in message
        or "unauthorized" in message
        or "resource exhausted" in message
        or "permission denied" in message
        or "api key not valid" in message
    )


def _extract_json_text(response_text: str) -> str:
    text = (response_text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _gemini_model() -> Any:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-1.5-flash")


async def optimize_resume(
    resume_text: str,
    job_description: str,
    missing_keywords: list[str],
    tone: str = "professional",
    length_mode: str = "balanced",
    target_seniority: str = "auto",
    strictness: str = "strict",
    role_template: str = "software",
    region_style: str = "US",
    language: str = "English",
) -> dict:
    model = _gemini_model()
    if model is None:
        return _fallback_optimize_resume(
            resume_text=resume_text,
            job_description=job_description,
            missing_keywords=missing_keywords,
            reason="missing_api_key",
        )

    system_prompt = (
        "You are an expert resume coach and ATS optimization specialist. "
        "Your job is to rewrite the resume to maximize ATS score for the given "
        "job description. Be specific, use strong action verbs, quantify "
        "achievements where possible, and naturally integrate the missing keywords. "
        "Do not invent fake employers, fake dates, fake titles, fake tools, or fake metrics. "
        "If data is missing, improve wording without fabricating facts."
    )

    user_prompt = (
        "Rewrite the resume using the job description and missing keyword list. "
        "Return ONLY a valid JSON object with exactly four keys: \n"
        "1) optimized_resume: full rewritten resume as plain text preserving logical "
        "sections like Experience, Education, Skills\n"
        "2) changes_summary: array of exactly 5 concise strings describing top "
        "improvements made\n"
        "3) change_reasons: array of objects with keys change and reason\n"
        "4) truthfulness_notes: array of strings with claims to verify\n\n"
        f"REWRITE CONTROLS:\n"
        f"- Tone: {tone}\n"
        f"- Length Mode: {length_mode}\n"
        f"- Target Seniority: {target_seniority}\n"
        f"- Strictness: {strictness}\n"
        f"- Role Template: {role_template}\n"
        f"- Regional Style: {region_style}\n"
        f"- Language: {language}\n\n"
        f"RESUME:\n{resume_text}\n\n"
        f"JOB DESCRIPTION:\n{job_description}\n\n"
        f"MISSING KEYWORDS:\n{', '.join(missing_keywords) if missing_keywords else 'None'}"
    )

    try:
        response = model.generate_content(
            contents=[
                {"role": "user", "parts": [{"text": system_prompt}]},
                {"role": "user", "parts": [{"text": user_prompt}]},
            ],
            generation_config={
                "temperature": 0.5,
                "response_mime_type": "application/json",
            },
        )

        content = _extract_json_text(getattr(response, "text", "") or "{}")
        result = json.loads(content)

        optimized_resume = result.get("optimized_resume", "")
        changes_summary = result.get("changes_summary", [])
        change_reasons = result.get("change_reasons", [])
        truthfulness_notes = result.get("truthfulness_notes", [])

        if (
            not isinstance(optimized_resume, str)
            or not isinstance(changes_summary, list)
            or not isinstance(change_reasons, list)
            or not isinstance(truthfulness_notes, list)
        ):
            raise ValueError("AI response format was invalid.")

        return {
            "optimized_resume": optimized_resume,
            "changes_summary": changes_summary,
            "change_reasons": change_reasons,
            "truthfulness_notes": truthfulness_notes,
        }
    except ValueError:
        raise
    except Exception as exc:
        if _is_recoverable_api_error(exc):
            return _fallback_optimize_resume(
                resume_text=resume_text,
                job_description=job_description,
                missing_keywords=missing_keywords,
                reason="api_unavailable_or_unauthorized",
            )
        raise ValueError(f"Failed to optimize resume with AI: {exc}") from exc


async def generate_cover_letter(
    resume_text: str,
    job_description: str,
    tone: str = "professional",
    region_style: str = "US",
    language: str = "English",
) -> dict:
    model = _gemini_model()
    if model is None:
        return {
            "cover_letter": (
                "Dear Hiring Manager,\n\n"
                "I am excited to apply for this opportunity. My resume aligns with the role's core skills, "
                "and I am confident I can contribute meaningful impact.\n\n"
                "Sincerely,\nCandidate"
            ),
            "notes": ["Generated using fallback template because AI service was unavailable."],
        }

    prompt = (
        "Create a concise, role-specific cover letter using the resume and job description. "
        "Do not invent fake facts. Keep content truthful and interview-defensible. "
        "Return JSON with keys: cover_letter (string), notes (array of strings).\n\n"
        f"Tone: {tone}\n"
        f"Regional Style: {region_style}\n"
        f"Language: {language}\n\n"
        f"Resume:\n{resume_text}\n\n"
        f"Job Description:\n{job_description}"
    )

    try:
        response = model.generate_content(
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            generation_config={
                "temperature": 0.4,
                "response_mime_type": "application/json",
            },
        )
        content = _extract_json_text(getattr(response, "text", "") or "{}")
        result = json.loads(content)
        cover_letter = result.get("cover_letter", "").strip()
        notes = result.get("notes", [])
        if not cover_letter:
            raise ValueError("Cover letter generation returned empty content.")
        return {"cover_letter": cover_letter, "notes": notes if isinstance(notes, list) else []}
    except Exception:
        return {
            "cover_letter": (
                "Dear Hiring Manager,\n\n"
                "I am writing to express my interest in this role. My background matches key responsibilities "
                "listed in the job description, and I would value the opportunity to contribute.\n\n"
                "Sincerely,\nCandidate"
            ),
            "notes": ["Generated using fallback template due temporary AI generation issue."],
        }
