function KeywordPanel({ matched, missing }) {
  return (
    <section className="card">
      <h2 className="panel-title">Keyword Match Analysis</h2>

      <h3>Found in Resume ✓</h3>
      <div className="chips-wrap" style={{ marginBottom: "14px" }}>
        {matched.length ? (
          matched.map((keyword) => (
            <span key={`matched-${keyword}`} className="keyword-chip matched">
              {keyword}
            </span>
          ))
        ) : (
          <span className="helper-text">No job keywords found yet.</span>
        )}
      </div>

      <h3>Missing Keywords ✗</h3>
      <div className="chips-wrap">
        {missing.length ? (
          missing.map((keyword) => (
            <span key={`missing-${keyword}`} className="keyword-chip missing">
              {keyword}
            </span>
          ))
        ) : (
          <span className="helper-text">Great! No critical keywords are missing.</span>
        )}
      </div>

      <div className="helper-text">
        Add these missing keywords naturally into your experience section.
      </div>
    </section>
  );
}

export default KeywordPanel;
