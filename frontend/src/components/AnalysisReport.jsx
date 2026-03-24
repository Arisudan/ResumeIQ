function AnalysisReport({ result }) {
  const improvement = result.score_improvement_estimate || {
    before: result.score,
    after: result.score,
    delta: 0,
  };

  return (
    <section className="card">
      <h2 className="panel-title">Phase 1 Analysis Report</h2>

      <div className="insight-grid">
        <div className="insight-box">
          <strong>{result.analysis_version || "phase1"}</strong>
          <span>Analysis Version</span>
        </div>
        <div className="insight-box">
          <strong>{improvement.before} → {improvement.after}</strong>
          <span>Estimated Score Shift</span>
        </div>
        <div className="insight-box">
          <strong>{improvement.delta >= 0 ? `+${improvement.delta}` : improvement.delta}</strong>
          <span>Delta</span>
        </div>
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

      <h3>ATS Factor Breakdown</h3>
      <div className="section-score-list">
        {(result.ats_factor_breakdown || []).map((item) => (
          <div key={item.factor} className="section-score-item">
            <div className="section-score-head">
              <span>{item.factor}</span>
              <span>{item.score}% ({item.weight}%)</span>
            </div>
            <div className="mini-bar-track">
              <div className="mini-bar-fill" style={{ width: `${item.score}%` }} />
            </div>
          </div>
        ))}
      </div>

      <h3>Experience Gap Check</h3>
      <div className="insight-grid">
        <div className="insight-box">
          <strong>{result.experience_gap?.required_years ?? "N/A"}</strong>
          <span>Required Years</span>
        </div>
        <div className="insight-box">
          <strong>{result.experience_gap?.resume_years_hint ?? "N/A"}</strong>
          <span>Resume Years Hint</span>
        </div>
        <div className="insight-box">
          <strong>{result.experience_gap?.status ?? "unknown"}</strong>
          <span>Status</span>
        </div>
      </div>

      <h3>Required Keyword Risk</h3>
      <div className="chips-wrap" style={{ marginBottom: "10px" }}>
        {(result.missing_required_keywords || []).length ? (
          result.missing_required_keywords.map((keyword) => (
            <span key={`required-missing-${keyword}`} className="keyword-chip missing">
              {keyword}
            </span>
          ))
        ) : (
          <span className="helper-text">No missing required keywords detected.</span>
        )}
      </div>

      <h3>Bullet Quality</h3>
      <div className="insight-grid">
        <div className="insight-box">
          <strong>{result.bullet_quality?.total_bullets ?? 0}</strong>
          <span>Total Bullets</span>
        </div>
        <div className="insight-box">
          <strong>{result.bullet_quality?.quantified_bullets ?? 0}</strong>
          <span>Quantified Bullets</span>
        </div>
        <div className="insight-box">
          <strong>{result.bullet_quality?.overall_strength ?? 0}%</strong>
          <span>Bullet Strength</span>
        </div>
        <div className="insight-box">
          <strong>{result.bullet_quality?.achievement_bullets ?? 0}</strong>
          <span>Achievement Bullets</span>
        </div>
      </div>

      <h3>Readability & Contact Quality</h3>
      <div className="insight-grid">
        <div className="insight-box">
          <strong>{result.readability?.readability_score ?? 0}%</strong>
          <span>Readability</span>
        </div>
        <div className="insight-box">
          <strong>{result.readability?.grammar_score ?? 0}%</strong>
          <span>Grammar Signal</span>
        </div>
        <div className="insight-box">
          <strong>{result.contact_checks?.email_present ? "Yes" : "No"}</strong>
          <span>Email Present</span>
        </div>
      </div>

      <div className="insight-grid">
        <div className="insight-box">
          <strong>{result.contact_checks?.linkedin_present ? "Yes" : "No"}</strong>
          <span>LinkedIn Present</span>
        </div>
        <div className="insight-box">
          <strong>{result.contact_checks?.phone_present ? "Yes" : "No"}</strong>
          <span>Phone Present</span>
        </div>
        <div className="insight-box">
          <strong>{result.language || "English"}</strong>
          <span>Detected Language</span>
        </div>
      </div>

      <h3>LinkedIn Alignment</h3>
      <div className="insight-grid">
        <div className="insight-box">
          <strong>{result.linkedin_alignment?.status ?? "not_provided"}</strong>
          <span>Status</span>
        </div>
        <div className="insight-box">
          <strong>{result.linkedin_alignment?.overlap_score ?? 0}%</strong>
          <span>Overlap Score</span>
        </div>
        <div className="insight-box">
          <strong>{result.template_alignment?.score ?? 0}%</strong>
          <span>Template Alignment</span>
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

      {result.multi_job_preview && (
        <>
          <h3>Multi-Job Targeting Preview</h3>
          <div className="insight-grid">
            <div className="insight-box">
              <strong>{result.multi_job_preview.jobs_analyzed}</strong>
              <span>Jobs Compared</span>
            </div>
            <div className="insight-box">
              <strong>{result.multi_job_preview.best_fit_job_index + 1}</strong>
              <span>Best Fit Job #</span>
            </div>
            <div className="insight-box">
              <strong>{result.multi_job_preview.average_score}</strong>
              <span>Average Score</span>
            </div>
          </div>
        </>
      )}

      <h3>Placement Suggestions</h3>
      <ul className="changes-list" style={{ marginBottom: "16px" }}>
        {(result.keyword_placement || []).slice(0, 5).map((item, index) => (
          <li key={`${item.keyword}-${index}`}>
            <strong>{item.keyword}</strong> in <strong>{item.section}</strong>: {item.reason}
          </li>
        ))}
      </ul>

      <h3>Top Recommendations</h3>
      <ul className="changes-list">
        {(result.recommendations || []).map((tip, index) => (
          <li key={`${tip}-${index}`}>{tip}</li>
        ))}
      </ul>
    </section>
  );
}

export default AnalysisReport;
