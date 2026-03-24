import re

STOPWORDS = {
    "a",
    "the",
    "and",
    "or",
    "is",
    "in",
    "of",
    "to",
    "for",
    "with",
    "that",
    "this",
    "are",
    "be",
    "by",
    "from",
    "an",
    "as",
    "at",
    "it",
    "on",
    "its",
    "was",
    "has",
    "have",
    "been",
    "which",
    "will",
    "not",
    "but",
    "also",
    "we",
    "our",
    "you",
    "your",
}

WEAK_BULLET_STARTERS = {
    "responsible",
    "worked",
    "helped",
    "assisted",
    "involved",
    "participated",
}

ACTION_VERBS = {
    "built",
    "designed",
    "developed",
    "implemented",
    "optimized",
    "led",
    "delivered",
    "architected",
    "improved",
    "automated",
    "launched",
    "scaled",
    "managed",
    "owned",
    "drove",
}

SYNONYM_MAP = {
    "js": "javascript",
    "node": "nodejs",
    "node.js": "nodejs",
    "reactjs": "react",
    "ts": "typescript",
    "ci": "cicd",
    "cd": "cicd",
    "ci/cd": "cicd",
    "k8s": "kubernetes",
    "postgres": "postgresql",
    "gcp": "googlecloud",
    "aws": "amazonwebservices",
    "ml": "machinelearning",
    "nlp": "naturallanguageprocessing",
}

SECTION_ALIASES = {
    "experience": "Experience",
    "work experience": "Experience",
    "professional experience": "Experience",
    "projects": "Projects",
    "project": "Projects",
    "education": "Education",
    "skills": "Skills",
    "technical skills": "Skills",
    "summary": "Summary",
    "professional summary": "Summary",
    "certifications": "Certifications",
}

SENIORITY_KEYWORDS = {
    "intern": "Intern",
    "junior": "Junior",
    "associate": "Junior",
    "mid": "Mid",
    "senior": "Senior",
    "staff": "Senior",
    "lead": "Lead",
    "principal": "Principal",
    "manager": "Manager",
}

TEMPLATE_KEYWORDS = {
    "software": {"python", "java", "api", "microservices", "docker", "kubernetes", "react", "sql"},
    "data": {"python", "sql", "analytics", "pandas", "spark", "etl", "model", "dashboard"},
    "product": {"roadmap", "stakeholder", "metrics", "discovery", "launch", "experiments"},
    "sales": {"pipeline", "revenue", "quota", "crm", "forecast", "negotiation"},
    "design": {"figma", "prototype", "ux", "ui", "research", "wireframe"},
}


def _normalize_token(token: str) -> str:
    normalized = token.lower().strip().replace("/", "").replace("-", "")
    return SYNONYM_MAP.get(normalized, normalized)


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[A-Za-z][A-Za-z0-9+.#/-]*", text.lower())


def _extract_keywords(text: str) -> list[str]:
    tokens = _tokenize(text)
    filtered = []
    for token in tokens:
        normalized = _normalize_token(token)
        if normalized and normalized not in STOPWORDS and len(normalized) > 1:
            filtered.append(normalized)

    # Preserve appearance order while deduplicating.
    seen = set()
    keywords = []
    for token in filtered:
        if token not in seen:
            seen.add(token)
            keywords.append(token)
    return keywords


def _split_sentences(text: str) -> list[str]:
    sentences = [segment.strip() for segment in re.split(r"(?<=[.!?])\s+", text) if segment.strip()]
    return sentences or ([text.strip()] if text.strip() else [])


def _split_resume_sections(resume_text: str) -> dict[str, str]:
    current = "General"
    sections: dict[str, list[str]] = {current: []}

    for raw_line in resume_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        lowered = line.lower().rstrip(":")
        canonical = SECTION_ALIASES.get(lowered)
        is_header = canonical is not None or line.isupper()

        if is_header:
            current = canonical or line.title()
            sections.setdefault(current, [])
            continue

        sections.setdefault(current, []).append(line)

    return {name: "\n".join(lines).strip() for name, lines in sections.items() if lines}


def _classify_job_keywords(job_description: str, job_keywords: list[str]) -> tuple[list[str], list[str]]:
    required_markers = ("required", "must", "need", "minimum", "mandatory")
    preferred_markers = ("preferred", "nice", "bonus", "good to have", "plus")

    required = set()
    preferred = set()

    for line in job_description.splitlines():
        lowered = line.lower()
        line_keywords = set(_extract_keywords(line))
        if any(marker in lowered for marker in required_markers):
            required.update(line_keywords)
        if any(marker in lowered for marker in preferred_markers):
            preferred.update(line_keywords)

    for keyword in job_keywords:
        if keyword not in required and keyword not in preferred:
            preferred.add(keyword)

    required_list = [k for k in job_keywords if k in required]
    preferred_list = [k for k in job_keywords if k in preferred and k not in required]
    return required_list, preferred_list


def _analyze_bullets(resume_text: str) -> dict:
    bullets = [
        re.sub(r"^\s*[\-*•]\s*", "", line).strip()
        for line in resume_text.splitlines()
        if re.match(r"^\s*[\-*•]\s+", line)
    ]

    if not bullets:
        return {
            "total_bullets": 0,
            "strong_bullets": 0,
            "weak_bullets": 0,
            "quantified_bullets": 0,
            "achievement_bullets": 0,
            "overall_strength": 40,
        }

    weak = 0
    strong = 0
    quantified = 0
    achievement = 0

    for bullet in bullets:
        first_word = bullet.split()[0].lower() if bullet.split() else ""
        if first_word in WEAK_BULLET_STARTERS:
            weak += 1
        if first_word in ACTION_VERBS:
            strong += 1
        if re.search(r"\d|%|\$|x", bullet):
            quantified += 1
        if any(word in bullet.lower() for word in ("increased", "reduced", "improved", "saved", "grew", "delivered")):
            achievement += 1

    strength = int(round(((strong + quantified + achievement) / (3 * len(bullets))) * 100))

    return {
        "total_bullets": len(bullets),
        "strong_bullets": strong,
        "weak_bullets": weak,
        "quantified_bullets": quantified,
        "achievement_bullets": achievement,
        "overall_strength": max(20, min(100, strength)),
    }


def _infer_seniority(text: str) -> str:
    tokens = _extract_keywords(text)
    for token in tokens:
        if token in SENIORITY_KEYWORDS:
            return SENIORITY_KEYWORDS[token]
    return "Not clear"


def _extract_years_hint(text: str) -> int | None:
    matches = re.findall(r"(\d{1,2})\+?\s+years?", text.lower())
    if not matches:
        return None
    years = [int(value) for value in matches]
    return max(years) if years else None


def _experience_gap_check(resume_text: str, job_description: str) -> dict:
    required_years = _extract_years_hint(job_description)
    resume_years = _extract_years_hint(resume_text)

    if required_years is None:
        return {
            "required_years": None,
            "resume_years_hint": resume_years,
            "status": "not_specified",
            "gap": 0,
        }

    if resume_years is None:
        return {
            "required_years": required_years,
            "resume_years_hint": None,
            "status": "insufficient_signal",
            "gap": required_years,
        }

    gap = required_years - resume_years
    return {
        "required_years": required_years,
        "resume_years_hint": resume_years,
        "status": "meets" if gap <= 0 else "gap_detected",
        "gap": max(0, gap),
    }


def _keyword_placement_hints(missing_keywords: list[str]) -> list[dict]:
    hints = []
    for keyword in missing_keywords[:10]:
        if keyword in {"python", "java", "javascript", "react", "fastapi", "kubernetes", "docker", "sql"}:
            section = "Skills"
            reason = "Core technical keyword should be explicit in skills and stack summary."
        elif keyword in {"leadership", "mentoring", "stakeholder", "ownership", "management"}:
            section = "Experience"
            reason = "Leadership terms are strongest when tied to real impact in experience bullets."
        else:
            section = "Projects"
            reason = "Add this keyword where you describe tools and outcomes in projects or work samples."
        hints.append({"keyword": keyword, "section": section, "reason": reason})
    return hints


def _contact_and_format_checks(resume_text: str) -> dict:
    email_ok = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", resume_text) is not None
    linkedin_ok = re.search(r"linkedin\.com/", resume_text.lower()) is not None
    phone_ok = re.search(r"(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)\d{3}[\s-]?\d{4}", resume_text) is not None

    lines = [line for line in resume_text.splitlines() if line.strip()]
    overlong_lines = sum(1 for line in lines if len(line) > 140)

    return {
        "email_present": email_ok,
        "linkedin_present": linkedin_ok,
        "phone_present": phone_ok,
        "overlong_lines": overlong_lines,
        "format_status": "good" if overlong_lines < 3 else "review_needed",
    }


def _readability_and_grammar(resume_text: str) -> dict:
    sentences = _split_sentences(resume_text)
    words = re.findall(r"\b\w+\b", resume_text)
    avg_words = round(len(words) / len(sentences), 1) if sentences else 0.0

    long_sentence_count = sum(1 for sentence in sentences if len(re.findall(r"\b\w+\b", sentence)) > 28)
    repeated_punct = len(re.findall(r"[!?.]{2,}", resume_text))
    low_start = sum(1 for sentence in sentences if sentence and sentence[0].islower())

    readability_score = max(0, min(100, int(round(100 - max(0, avg_words - 18) * 2 - long_sentence_count * 3))))
    grammar_score = max(0, min(100, int(round(100 - repeated_punct * 8 - low_start * 5))))

    return {
        "avg_words_per_sentence": avg_words,
        "readability_score": readability_score,
        "grammar_score": grammar_score,
        "long_sentences": long_sentence_count,
        "repeated_punctuation": repeated_punct,
    }


def _truthfulness_flags(resume_text: str) -> list[str]:
    flags = []
    lower = resume_text.lower()
    if re.search(r"\b(guaranteed|always|never failed|perfect)\b", lower):
        flags.append("Contains absolute claims that may be hard to verify in interviews.")
    if re.search(r"\b\d{4,}%\b", resume_text):
        flags.append("Contains unusually high percentage claims; verify metric accuracy.")
    if re.search(r"\bexpert in all\b", lower):
        flags.append("Broad 'expert in all' wording appears unrealistic; narrow the claim scope.")
    return flags


def _linkedin_alignment(resume_text: str, linkedin_text: str | None) -> dict:
    if not linkedin_text or not linkedin_text.strip():
        return {"status": "not_provided", "overlap_score": 0, "shared_keywords": []}

    resume_keywords = set(_extract_keywords(resume_text))
    li_keywords = set(_extract_keywords(linkedin_text))
    if not li_keywords:
        return {"status": "insufficient_signal", "overlap_score": 0, "shared_keywords": []}

    shared = sorted(resume_keywords.intersection(li_keywords))
    overlap = int(round((len(shared) / len(li_keywords)) * 100))
    status = "aligned" if overlap >= 60 else "review_needed"
    return {
        "status": status,
        "overlap_score": overlap,
        "shared_keywords": shared[:20],
    }


def _detect_language(text: str) -> str:
    if re.search(r"[\u0B80-\u0BFF]", text):
        return "Tamil"
    if re.search(r"[\u0900-\u097F]", text):
        return "Hindi"
    non_ascii = sum(1 for char in text if ord(char) > 127)
    ratio = (non_ascii / len(text)) if text else 0
    if ratio > 0.2:
        return "Multilingual"
    return "English"


def _template_alignment_score(job_keywords: list[str], role_template: str) -> dict:
    template = TEMPLATE_KEYWORDS.get((role_template or "").lower())
    if not template:
        return {"role_template": "general", "score": 0, "matched": []}

    matched = sorted(set(job_keywords).intersection(template))
    score = int(round((len(matched) / len(template)) * 100)) if template else 0
    return {
        "role_template": role_template,
        "score": score,
        "matched": matched,
    }


def _ats_factor_breakdown(
    coverage_score: float,
    required_score: float,
    section_quality: float,
    bullet_score: float,
    achievement_score: float,
    experience_score: float,
    readability_score: float,
) -> list[dict]:
    factors = [
        ("Keyword Coverage", coverage_score, 0.25),
        ("Required Skills Match", required_score, 0.2),
        ("Section Quality", section_quality, 0.15),
        ("Bullet Strength", bullet_score, 0.12),
        ("Achievement Evidence", achievement_score, 0.1),
        ("Experience Alignment", experience_score, 0.1),
        ("Readability", readability_score, 0.08),
    ]

    result = []
    for name, value, weight in factors:
        contribution = int(round(value * weight * 100))
        result.append(
            {
                "factor": name,
                "score": int(round(value * 100)),
                "weight": int(round(weight * 100)),
                "contribution": contribution,
            }
        )
    return result


def analyze_resume(
    resume_text: str,
    job_description: str,
    linkedin_text: str | None = None,
    role_template: str = "software",
    region_style: str = "US",
) -> dict:
    job_keywords = _extract_keywords(job_description)
    resume_keywords = set(_extract_keywords(resume_text))

    matched = [keyword for keyword in job_keywords if keyword in resume_keywords]
    missing = [keyword for keyword in job_keywords if keyword not in resume_keywords]

    required_keywords, preferred_keywords = _classify_job_keywords(job_description, job_keywords)
    matched_required = [keyword for keyword in required_keywords if keyword in resume_keywords]
    missing_required = [keyword for keyword in required_keywords if keyword not in resume_keywords]

    sections = _split_resume_sections(resume_text)
    section_scores = []
    for section_name, section_text in sections.items():
        section_keywords = set(_extract_keywords(section_text))
        section_matched = [keyword for keyword in job_keywords if keyword in section_keywords]
        total = len(job_keywords)
        section_score = int(round((len(section_matched) / total) * 100)) if total else 0
        section_scores.append(
            {
                "section": section_name,
                "score": section_score,
                "matched": len(section_matched),
                "total": total,
            }
        )

    section_scores = sorted(section_scores, key=lambda item: item["score"], reverse=True)

    bullet_quality = _analyze_bullets(resume_text)
    experience_gap = _experience_gap_check(resume_text=resume_text, job_description=job_description)
    contact_checks = _contact_and_format_checks(resume_text)
    readability = _readability_and_grammar(resume_text)
    truth_flags = _truthfulness_flags(resume_text)
    linkedin_alignment = _linkedin_alignment(resume_text, linkedin_text)
    detected_language = _detect_language(resume_text + "\n" + job_description)
    template_alignment = _template_alignment_score(job_keywords, role_template)

    total = len(job_keywords)
    coverage_score = (len(matched) / total) if total else 0
    required_score = (len(matched_required) / len(required_keywords)) if required_keywords else coverage_score
    bullet_score = bullet_quality["overall_strength"] / 100
    section_quality_score = (
        (sum(item["score"] for item in section_scores) / (len(section_scores) * 100)) if section_scores else 0
    )
    achievement_score = (
        bullet_quality["achievement_bullets"] / bullet_quality["total_bullets"]
        if bullet_quality["total_bullets"]
        else 0
    )
    experience_score = 1.0
    if experience_gap["status"] == "gap_detected":
        experience_score = max(0.2, 1 - (experience_gap["gap"] * 0.12))
    elif experience_gap["status"] == "insufficient_signal":
        experience_score = 0.6

    readability_score = readability["readability_score"] / 100

    factor_breakdown = _ats_factor_breakdown(
        coverage_score=coverage_score,
        required_score=required_score,
        section_quality=section_quality_score,
        bullet_score=bullet_score,
        achievement_score=achievement_score,
        experience_score=experience_score,
        readability_score=readability_score,
    )

    weighted_final = sum(item["contribution"] for item in factor_breakdown)

    final_score = max(0, min(100, weighted_final))

    target_level = _infer_seniority(job_description)
    resume_level = _infer_seniority(resume_text)
    role_alignment = {
        "target_level": target_level,
        "resume_level_hint": resume_level,
        "status": "aligned" if target_level == resume_level or target_level == "Not clear" else "review_needed",
    }

    recommendations = []
    if missing_required:
        recommendations.append("Add missing required keywords in Experience and Skills sections first.")
    if bullet_quality["quantified_bullets"] < max(1, bullet_quality["total_bullets"] // 2):
        recommendations.append("Quantify more bullet points with numbers, percentages, or impact metrics.")
    if bullet_quality["weak_bullets"] > 0:
        recommendations.append("Rewrite weak bullet starters using action verbs like Built, Led, or Optimized.")
    if experience_gap["status"] == "gap_detected":
        recommendations.append("Address experience gap by emphasizing relevant projects and measurable impact.")
    if readability["readability_score"] < 70:
        recommendations.append("Shorten long sentences and simplify phrasing for faster recruiter scanning.")
    if not contact_checks["linkedin_present"]:
        recommendations.append("Add a LinkedIn profile URL to improve recruiter trust and verification.")
    if truth_flags:
        recommendations.append("Review high-risk claims and ensure every major metric can be defended.")
    if template_alignment["score"] < 30:
        recommendations.append("Align more content with role-specific template keywords for this function.")
    if len(missing) > 8:
        recommendations.append("Include more domain keywords from the job description across key sections.")
    if role_alignment["status"] == "review_needed":
        recommendations.append("Tune summary and top experience lines to better match the target seniority level.")

    if not recommendations:
        recommendations.append("Your resume is well aligned; focus on polishing impact-oriented language.")

    return {
        "score": final_score,
        "matched": matched,
        "missing": missing,
        "total_job_keywords": total,
        "required_keywords": required_keywords,
        "preferred_keywords": preferred_keywords,
        "matched_required": matched_required,
        "missing_required": missing_required,
        "section_scores": section_scores,
        "bullet_quality": bullet_quality,
        "experience_gap": experience_gap,
        "contact_checks": contact_checks,
        "readability": readability,
        "truthfulness_flags": truth_flags,
        "linkedin_alignment": linkedin_alignment,
        "language": detected_language,
        "regional_style": region_style,
        "template_alignment": template_alignment,
        "ats_factor_breakdown": factor_breakdown,
        "keyword_placement": _keyword_placement_hints(missing),
        "role_alignment": role_alignment,
        "recommendations": recommendations[:5],
        "analysis_version": "phase1_plus",
    }


def analyze_multi_target(
    resume_text: str,
    job_descriptions: list[str],
    linkedin_text: str | None = None,
    role_template: str = "software",
    region_style: str = "US",
) -> dict:
    clean_jobs = [job.strip() for job in job_descriptions if job and job.strip()]
    if not clean_jobs:
        raise ValueError("At least one job description is required for multi-target analysis.")

    job_results = []
    for index, jd in enumerate(clean_jobs):
        result = analyze_resume(
            resume_text=resume_text,
            job_description=jd,
            linkedin_text=linkedin_text,
            role_template=role_template,
            region_style=region_style,
        )
        job_results.append(
            {
                "job_index": index,
                "score": result["score"],
                "missing_keywords": result["missing"][:15],
                "missing_required_keywords": result["missing_required"],
                "recommendations": result["recommendations"],
                "ats_factor_breakdown": result["ats_factor_breakdown"],
            }
        )

    ranked = sorted(job_results, key=lambda item: item["score"], reverse=True)
    return {
        "jobs_analyzed": len(clean_jobs),
        "best_fit_job_index": ranked[0]["job_index"],
        "average_score": int(round(sum(item["score"] for item in ranked) / len(ranked))),
        "job_results": ranked,
    }


def score_ats(resume_text: str, job_description: str) -> dict:
    analysis = analyze_resume(resume_text=resume_text, job_description=job_description)
    return {
        "score": analysis["score"],
        "matched": analysis["matched"],
        "missing": analysis["missing"],
        "total_job_keywords": analysis["total_job_keywords"],
    }
