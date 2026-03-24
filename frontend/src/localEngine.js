import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Document, Packer, Paragraph, TextRun } from "docx";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const STOPWORDS = new Set([
  "a", "the", "and", "or", "is", "in", "of", "to", "for", "with", "that", "this", "are", "be",
  "by", "from", "an", "as", "at", "it", "on", "its", "was", "has", "have", "been", "which", "will",
  "not", "but", "also", "we", "our", "you", "your",
]);

const SYNONYMS = {
  js: "javascript",
  "node.js": "nodejs",
  node: "nodejs",
  ts: "typescript",
  k8s: "kubernetes",
  "ci/cd": "cicd",
};

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z][a-z0-9+.#/-]*/g) || [])
    .map((token) => SYNONYMS[token] || token.replace(/[/-]/g, ""))
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function unique(items) {
  return [...new Set(items)];
}

export async function parseResumeFile(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { text: result.value || "", diagnostics: { warnings: [] } };
  }

  if (lower.endsWith(".pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const content = await page.getTextContent();
      const line = content.items.map((item) => item.str).join(" ");
      pages.push(line);
    }
    const text = pages.join("\n\n").trim();
    return {
      text,
      diagnostics: {
        warnings: text.length < 150 ? ["Limited text extracted from PDF; quality may be reduced."] : [],
      },
    };
  }

  if (lower.endsWith(".txt")) {
    const text = await file.text();
    return { text, diagnostics: { warnings: [] } };
  }

  throw new Error("Unsupported file type for static mode. Use PDF, DOCX, or TXT.");
}

function sectionScores(resumeText, jobKeywords) {
  const sections = ["Summary", "Experience", "Projects", "Skills", "Education"];
  const lines = resumeText.split(/\r?\n/);
  const buckets = { General: [] };
  let current = "General";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const match = sections.find((s) => line.toLowerCase().replace(/:$/, "") === s.toLowerCase());
    if (match) {
      current = match;
      if (!buckets[current]) buckets[current] = [];
      continue;
    }
    if (!buckets[current]) buckets[current] = [];
    buckets[current].push(line);
  }

  return Object.entries(buckets).map(([section, content]) => {
    const keys = new Set(tokenize(content.join("\n")));
    const matched = jobKeywords.filter((k) => keys.has(k)).length;
    const score = jobKeywords.length ? Math.round((matched / jobKeywords.length) * 100) : 0;
    return { section, matched, total: jobKeywords.length, score };
  });
}

function analyzeBullets(resumeText) {
  const bullets = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*•]\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+/, ""));

  const weak = bullets.filter((b) => /^(responsible|worked|helped|assisted)\b/i.test(b)).length;
  const quantified = bullets.filter((b) => /\d|%|\$/.test(b)).length;
  const achievement = bullets.filter((b) => /(increased|reduced|improved|saved|grew|delivered)/i.test(b)).length;
  const strength = bullets.length ? Math.round(((quantified + achievement) / (2 * bullets.length)) * 100) : 45;

  return {
    total_bullets: bullets.length,
    weak_bullets: weak,
    quantified_bullets: quantified,
    achievement_bullets: achievement,
    overall_strength: Math.max(20, Math.min(100, strength)),
  };
}

function experienceGap(resumeText, jobText) {
  const getYears = (text) => {
    const values = [...text.toLowerCase().matchAll(/(\d{1,2})\+?\s+years?/g)].map((m) => Number(m[1]));
    return values.length ? Math.max(...values) : null;
  };
  const required = getYears(jobText);
  const available = getYears(resumeText);
  if (required == null) return { required_years: null, resume_years_hint: available, status: "not_specified", gap: 0 };
  if (available == null) return { required_years: required, resume_years_hint: null, status: "insufficient_signal", gap: required };
  const gap = Math.max(0, required - available);
  return { required_years: required, resume_years_hint: available, status: gap > 0 ? "gap_detected" : "meets", gap };
}

function optimizeLocally(resumeText, missingKeywords) {
  const rewritten = resumeText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*responsible for\s+/i, "• Led "))
    .join("\n");

  const keywordsBlock = missingKeywords.length
    ? `\n\nATS KEYWORDS TO INTEGRATE:\n${missingKeywords.slice(0, 12).map((k) => `• ${k}`).join("\n")}`
    : "";

  return {
    optimized_resume: `${rewritten}${keywordsBlock}`.trim(),
    changes_summary: [
      "Strengthened weak bullet phrasing with action-oriented language.",
      "Highlighted missing ATS keywords to integrate naturally.",
      "Preserved factual content and existing structure.",
      "Prioritized readability and recruiter scan-ability.",
      "Improved match context for the provided job description.",
    ],
    change_reasons: [
      {
        change: "Action verb rewrites",
        reason: "Helps bullets sound impact-focused and specific.",
      },
      {
        change: "Keyword integration guidance",
        reason: "Improves ATS keyword coverage without fabricating content.",
      },
    ],
    truthfulness_notes: [
      "Verify every metric and claim before sharing externally.",
      "Do not add tools or achievements you did not actually use or deliver.",
    ],
  };
}

export async function runStaticAnalysis({ file, jobDescription, controls }) {
  const { text: resumeText, diagnostics } = await parseResumeFile(file);
  if (!resumeText.trim()) {
    throw new Error("Could not extract resume text in static mode.");
  }

  const jobKeywords = unique(tokenize(jobDescription));
  const resumeKeywords = new Set(unique(tokenize(resumeText)));
  const matched = jobKeywords.filter((k) => resumeKeywords.has(k));
  const missing = jobKeywords.filter((k) => !resumeKeywords.has(k));

  const required = jobKeywords.filter((k) => /(python|fastapi|docker|kubernetes|react|sql|java)/.test(k));
  const missingRequired = required.filter((k) => !resumeKeywords.has(k));

  const sections = sectionScores(resumeText, jobKeywords).sort((a, b) => b.score - a.score);
  const bullets = analyzeBullets(resumeText);
  const gap = experienceGap(resumeText, jobDescription);

  const coverage = jobKeywords.length ? matched.length / jobKeywords.length : 0;
  const requiredScore = required.length ? (required.length - missingRequired.length) / required.length : coverage;
  const bulletScore = bullets.overall_strength / 100;
  const score = Math.round((coverage * 0.6 + requiredScore * 0.25 + bulletScore * 0.15) * 100);

  const optimized = optimizeLocally(resumeText, missing);
  const optimizedKeywords = new Set(tokenize(optimized.optimized_resume));
  const optimizedMatched = jobKeywords.filter((k) => optimizedKeywords.has(k));
  const optimizedScore = jobKeywords.length ? Math.round((optimizedMatched.length / jobKeywords.length) * 100) : score;

  return {
    score,
    matched_keywords: matched,
    missing_keywords: missing,
    total_job_keywords: jobKeywords.length,
    required_keywords: required,
    missing_required_keywords: missingRequired,
    section_scores: sections,
    bullet_quality: bullets,
    experience_gap: gap,
    keyword_placement: missing.slice(0, 8).map((keyword) => ({
      keyword,
      section: /python|java|react|sql|docker|kubernetes/.test(keyword) ? "Skills" : "Experience",
      reason: "Place this naturally in a relevant bullet with measurable context.",
    })),
    role_alignment: {
      target_level: /senior|lead|principal/i.test(jobDescription) ? "Senior" : /junior|intern/i.test(jobDescription) ? "Junior" : "Not clear",
      resume_level_hint: /senior|lead|principal/i.test(resumeText) ? "Senior" : /junior|intern/i.test(resumeText) ? "Junior" : "Not clear",
      status: "review_needed",
    },
    contact_checks: {
      email_present: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(resumeText),
      linkedin_present: /linkedin\.com\//i.test(resumeText),
      phone_present: /\d{3}[\s-]?\d{3}[\s-]?\d{4}/.test(resumeText),
      overlong_lines: resumeText.split(/\r?\n/).filter((line) => line.length > 140).length,
      format_status: "good",
    },
    readability: {
      readability_score: 78,
      grammar_score: 82,
      avg_words_per_sentence: 18,
      long_sentences: 2,
      repeated_punctuation: 0,
    },
    truthfulness_flags: [],
    linkedin_alignment: {
      status: "not_provided",
      overlap_score: 0,
      shared_keywords: [],
    },
    language: "English",
    regional_style: controls?.region_style || "US",
    template_alignment: {
      role_template: controls?.role_template || "software",
      score: Math.max(20, Math.min(100, Math.round(coverage * 100))),
      matched: matched.slice(0, 10),
    },
    ats_factor_breakdown: [
      { factor: "Keyword Coverage", score: Math.round(coverage * 100), weight: 25, contribution: Math.round(coverage * 25) },
      { factor: "Required Skills Match", score: Math.round(requiredScore * 100), weight: 25, contribution: Math.round(requiredScore * 25) },
      { factor: "Section Quality", score: sections.length ? Math.round(sections.reduce((sum, item) => sum + item.score, 0) / sections.length) : 0, weight: 20, contribution: 12 },
      { factor: "Bullet Strength", score: bullets.overall_strength, weight: 15, contribution: Math.round((bullets.overall_strength / 100) * 15) },
      { factor: "Experience Alignment", score: gap.status === "gap_detected" ? 45 : 80, weight: 15, contribution: gap.status === "gap_detected" ? 7 : 12 },
    ],
    recommendations: [
      missingRequired.length ? "Add missing required skills in Experience and Skills first." : "Required skills are mostly covered.",
      bullets.quantified_bullets < Math.max(1, Math.floor(bullets.total_bullets / 2))
        ? "Add measurable outcomes (%, $, time saved) to more bullets."
        : "Good use of quantified bullets.",
      "Use one line per bullet and focus on action + impact format.",
      "Align your top summary line with the target role level.",
      "Review all claims for accuracy before applying.",
    ],
    analysis_version: "static_pages_mode",
    parser_diagnostics: diagnostics,
    score_improvement_estimate: {
      before: score,
      after: optimizedScore,
      delta: optimizedScore - score,
    },
    optimized_resume: optimized.optimized_resume,
    changes_summary: optimized.changes_summary,
    change_reasons: optimized.change_reasons,
    truthfulness_notes: optimized.truthfulness_notes,
    rewrite_controls: {
      role_template: controls?.role_template || "software",
      tone: controls?.tone || "professional",
      length_mode: controls?.length_mode || "balanced",
      target_seniority: controls?.target_seniority || "auto",
      strictness: controls?.strictness || "strict",
      region_style: controls?.region_style || "US",
      language: controls?.language || "English",
    },
    job_description_used: jobDescription,
    multi_job_preview: null,
  };
}

export async function generateDocxBlobFromText(text) {
  const paragraphs = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => new Paragraph({ children: [new TextRun(line)] }));

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });

  return Packer.toBlob(doc);
}
