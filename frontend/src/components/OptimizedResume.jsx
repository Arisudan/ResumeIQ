import { useState } from "react";

function OptimizedResume({ text, changes, changeReasons, truthfulnessNotes }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      setCopied(false);
    }
  };

  return (
    <section className="card">
      <h2 className="panel-title">Optimized Resume Output</h2>

      <ul className="changes-list">
        {changes?.map((change, index) => (
          <li key={`${change}-${index}`}>{change}</li>
        ))}
      </ul>

      {(changeReasons || []).length > 0 && (
        <>
          <h3>Why These Changes</h3>
          <ul className="changes-list">
            {changeReasons.map((item, index) => (
              <li key={`${item.change || "reason"}-${index}`}>
                <strong>{item.change || "Update"}:</strong> {item.reason || "Improves ATS relevance."}
              </li>
            ))}
          </ul>
        </>
      )}

      {(truthfulnessNotes || []).length > 0 && (
        <>
          <h3>Truthfulness Notes</h3>
          <ul className="warning-list">
            {truthfulnessNotes.map((note, index) => (
              <li key={`${note}-${index}`}>{note}</li>
            ))}
          </ul>
        </>
      )}

      <div className="actions-row">
        <button type="button" className="btn-secondary" onClick={handleCopy}>
          {copied ? "Copied" : "Copy to Clipboard"}
        </button>
      </div>

      <div className="optimized-text">{text}</div>
    </section>
  );
}

export default OptimizedResume;
