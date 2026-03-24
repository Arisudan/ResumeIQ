import { useMemo, useState } from "react";

function statusLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good Start";
  return "Needs Work";
}

function statusClass(score) {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  return "warning";
}

function AnalysisReport({ result }) {
  const [activeFactor, setActiveFactor] = useState("impact");

  const improvement = result.score_improvement_estimate || {
    before: result.score,
    after: result.score,
    delta: 0,
  };

  const topFactors = useMemo(() => (result.ats_factor_breakdown || []).slice(0, 4), [result.ats_factor_breakdown]);

  const priorityFixes = useMemo(() => {
    const fixes = [];
    if ((result.missing_required_keywords || []).length) {
      fixes.push("Add missing required skills in Experience + Skills first.");
    }
    if ((result.bullet_quality?.quantified_bullets || 0) < Math.max(1, Math.floor((result.bullet_quality?.total_bullets || 1) / 2))) {
      fixes.push("Add numbers or percentages in more bullets to prove impact.");
    }
    if ((result.readability?.readability_score || 0) < 70) {
      fixes.push("Shorten long lines for recruiter-friendly readability.");
    }
    if ((result.experience_gap?.status || "") === "gap_detected") {
      fixes.push("Address experience gap by emphasizing relevant project outcomes.");
    }
    fixes.push(...(result.recommendations || []).slice(0, 2));
    return fixes.slice(0, 5);
  }, [result]);

  const railPosition = Math.max(2, Math.min(98, result.score || 0));

  const insightRows = [
    {
      key: "impact",
      label: "Impact",
      score: result.bullet_quality?.overall_strength || 0,
      note: `${result.bullet_quality?.achievement_bullets || 0} outcome bullets`,
      checks: [
        "Quantify impact in bullets",
        "Use strong action verbs",
        "Highlight outcomes, not only tasks",
      ],
    },
    {
      key: "brevity",
      label: "Brevity",
      score: result.readability?.readability_score || 0,
      note: `${result.readability?.avg_words_per_sentence || 0} avg words/sentence`,
      checks: [
        "Keep each bullet to one clear point",
        "Trim filler words and repeated phrasing",
        "Prefer concise, measurable statements",
      ],
    },
    {
      key: "style",
      label: "Style",
      score: result.readability?.grammar_score || 0,
      note: result.contact_checks?.format_status || "review",
      checks: [
        "Maintain consistent tense",
        "Avoid grammar and punctuation issues",
        "Use clean section formatting",
      ],
    },
    {
      key: "skills",
      label: "Skills",
      score: result.template_alignment?.score || 0,
      note: `${(result.matched_keywords || []).length}/${result.total_job_keywords || 0} matched`,
      checks: [
        "Mirror high-priority job keywords",
        "Place critical skills in Experience + Skills",
        "Prioritize role-relevant tools first",
      ],
    },
  ];

  const activeInsight = insightRows.find((row) => row.key === activeFactor) || insightRows[0];

  return (
    <section className="report-card">
      <div className="report-head">
        <h2 className="panel-title" style={{ marginBottom: 0 }}>Resume Performance Report</h2>
        <span className={`mini-status ${statusClass(result.score || 0)}`}>{statusLabel(result.score || 0)}</span>
      </div>

      <div className="insight-quad">
        {insightRows.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`insight-tile ${activeFactor === item.key ? "active" : ""}`}
            onClick={() => setActiveFactor(item.key)}
          >
            <span className="insight-kicker">{item.label}</span>
            <strong>{item.score}/100</strong>
            <span className={`mini-status ${statusClass(item.score)}`}>{statusLabel(item.score)}</span>
            <small>{item.note}</small>
          </button>
        ))}
      </div>

      <div className="score-explainer">
        <div className="score-explainer-top">
          <div>
            <strong>Your resume scored {result.score} / 100</strong>
            <div className="helper-text" style={{ marginTop: 4 }}>
              Estimated improvement: {improvement.before} to {improvement.after} ({improvement.delta >= 0 ? `+${improvement.delta}` : improvement.delta})
            </div>
          </div>
          <div className={`mini-status ${statusClass(result.score || 0)}`}>{statusLabel(result.score || 0)}</div>
        </div>

        <div className="score-rail-wrap">
          <div className="score-rail" />
          <div className="score-pin" style={{ left: `${railPosition}%` }}>
            <span>YOUR RESUME</span>
          </div>
          <div className="score-rail-scale">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </div>

      <div className="report-breakdown">
        <div className="report-breakdown-score">
          <div className="score-circle-mini">
            <strong>{activeInsight.score}</strong>
            <span>{activeInsight.label}</span>
          </div>
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>{activeInsight.label} Checklist</h3>
          <ul className="check-list">
            {activeInsight.checks.map((check, idx) => (
              <li key={`${check}-${idx}`}>{check}</li>
            ))}
          </ul>
        </div>
      </div>

      <h3>Factor Breakdown</h3>
      <div className="section-score-list">
        {topFactors.map((item) => (
          <div key={item.factor} className="section-score-item">
            <div className="section-score-head">
              <span>{item.factor}</span>
              <span>{item.score}%</span>
            </div>
            <div className="mini-bar-track">
              <div className="mini-bar-fill" style={{ width: `${item.score}%` }} />
            </div>
            <small className="helper-text" style={{ marginTop: 8, display: "block" }}>
              Weight {item.weight}% and contribution {item.contribution}
            </small>
          </div>
        ))}
      </div>

      <h3>Top Priority Fixes</h3>
      <div className="priority-fixes">
        {priorityFixes.map((fix, index) => (
          <div key={`${fix}-${index}`} className="fix-item">
            <span className="fix-index">{index + 1}</span>
            <span>{fix}</span>
          </div>
        ))}
      </div>

      <h3>Risk and Validation Signals</h3>
      <div className="insight-grid">
        <div className="insight-box">
          <strong>{result.experience_gap?.status ?? "unknown"}</strong>
          <span>Experience Gap</span>
        </div>
        <div className="insight-box">
          <strong>{result.contact_checks?.email_present ? "Yes" : "No"}</strong>
          <span>Email Present</span>
        </div>
        <div className="insight-box">
          <strong>{result.contact_checks?.linkedin_present ? "Yes" : "No"}</strong>
          <span>LinkedIn Present</span>
        </div>
      </div>

      {(result.parser_diagnostics?.warnings || []).length > 0 && (
        <>
          <h3>Parser Warnings</h3>
          <ul className="warning-list">
            {result.parser_diagnostics.warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </>
      )}

      {(result.truthfulness_flags || []).length > 0 && (
        <>
          <h3>Truthfulness Assistant</h3>
          <ul className="warning-list">
            {result.truthfulness_flags.map((flag, index) => (
              <li key={`${flag}-${index}`}>{flag}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default AnalysisReport;
