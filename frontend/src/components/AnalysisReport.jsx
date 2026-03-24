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
  const [showExplanation, setShowExplanation] = useState(true);

  const improvement = result.score_improvement_estimate || {
    before: result.score,
    after: result.score,
    delta: 0,
  };

  const topFactors = useMemo(() => {
    const factors = result.ats_factor_breakdown || [];
    return factors.slice(0, 4);
  }, [result.ats_factor_breakdown]);

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
      label: "Impact",
      score: result.bullet_quality?.overall_strength || 0,
      note: `${result.bullet_quality?.achievement_bullets || 0} outcome bullets`,
    },
    {
      label: "Brevity",
      score: result.readability?.readability_score || 0,
      note: `${result.readability?.avg_words_per_sentence || 0} avg words/sentence`,
    },
    {
      label: "Style",
      score: result.readability?.grammar_score || 0,
      note: result.contact_checks?.format_status || "review",
    },
    {
      label: "Skills",
      score: result.template_alignment?.score || 0,
      note: `${(result.matched_keywords || []).length}/${result.total_job_keywords || 0} matched`,
    },
  ];

  return (
    <section className="card report-card">
      <div className="report-head">
        <h2 className="panel-title" style={{ marginBottom: 0 }}>Resume Performance Report</h2>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowExplanation((prev) => !prev)}
        >
          {showExplanation ? "Hide Explanation" : "Explain My Score"}
        </button>
      </div>

      <div className="insight-quad">
        {insightRows.map((item) => (
          <div key={item.label} className="insight-tile">
            <span className="insight-kicker">{item.label}</span>
            <strong>{item.score}/100</strong>
            <span className={`mini-status ${statusClass(item.score)}`}>{statusLabel(item.score)}</span>
            <small>{item.note}</small>
          </div>
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

      {showExplanation && (
        <>
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

          <h3>Section Match Strength</h3>
          <div className="section-score-list">
            {(result.section_scores || []).slice(0, 6).map((item) => (
              <div key={item.section} className="section-score-item">
                <div className="section-score-head">
                  <span>{item.section}</span>
                  <span>{item.score}%</span>
                </div>
                <div className="mini-bar-track">
                  <div className="mini-bar-fill" style={{ width: `${item.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          <h3>Line-Level Guidance</h3>
          <ul className="changes-list" style={{ marginBottom: "16px" }}>
            {(result.keyword_placement || []).slice(0, 5).map((item, index) => (
              <li key={`${item.keyword}-${index}`}>
                <strong>{item.keyword}</strong> in <strong>{item.section}</strong>: {item.reason}
              </li>
            ))}
          </ul>
        </>
      )}

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
