import { useState } from "react";

function CoverLetterPanel({ resumeText, jobDescription, controls }) {
  const [loading, setLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
          tone: controls?.tone || "professional",
          region_style: controls?.region_style || "US",
          language: controls?.language || "English",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate cover letter.");
      }

      const data = await response.json();
      setCoverLetter(data.cover_letter || "");
      setNotes(Array.isArray(data.notes) ? data.notes : []);
    } catch (err) {
      setError(err.message || "Unexpected error while generating cover letter.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <h2 className="panel-title">Optional Cover Letter</h2>
      <button className="btn-primary" type="button" onClick={generate} disabled={loading}>
        {loading ? "Generating Cover Letter..." : "Generate Cover Letter"}
      </button>

      {error && <div className="inline-error">{error}</div>}

      {notes.length > 0 && (
        <ul className="warning-list" style={{ marginTop: "12px" }}>
          {notes.map((note, index) => (
            <li key={`${note}-${index}`}>{note}</li>
          ))}
        </ul>
      )}

      {coverLetter && <div className="optimized-text" style={{ marginTop: "12px" }}>{coverLetter}</div>}
    </section>
  );
}

export default CoverLetterPanel;
