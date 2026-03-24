import { useState } from "react";
import "./App.css";
import AnalysisReport from "./components/AnalysisReport";
import AuthPanel from "./components/AuthPanel";
import CoverLetterPanel from "./components/CoverLetterPanel";
import DownloadButton from "./components/DownloadButton";
import HistoryPanel from "./components/HistoryPanel";
import KeywordPanel from "./components/KeywordPanel";
import OptimizedResume from "./components/OptimizedResume";
import ScoreCard from "./components/ScoreCard";
import UploadSection from "./components/UploadSection";

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState(localStorage.getItem("resumeiq_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("resumeiq_user");
    return raw ? JSON.parse(raw) : null;
  });

  const handleAuth = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("resumeiq_token", nextToken);
    localStorage.setItem("resumeiq_user", JSON.stringify(nextUser));
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("resumeiq_token");
    localStorage.removeItem("resumeiq_user");
  };

  const handleAnalyze = async (formData) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        let message = "Failed to analyze resume.";
        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {
          // Ignore JSON parse errors and keep fallback.
        }
        throw new Error(message);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Unexpected error occurred.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>ResumeIQ</h1>
        <p className="subtitle">Beat the ATS. Land the interview.</p>
      </header>

      {error && <div className="global-error">{error}</div>}

      <main className="main-grid">
        <div>
          <AuthPanel token={token} user={user} onAuth={handleAuth} onLogout={handleLogout} />
          <UploadSection onSubmit={handleAnalyze} loading={loading} />
          <HistoryPanel token={token} />
        </div>

        <div>
          {result && (
            <>
              <ScoreCard
                score={result.score}
                matched={result.matched_keywords}
                missing={result.missing_keywords}
                total={result.total_job_keywords}
              />
              <KeywordPanel
                matched={result.matched_keywords}
                missing={result.missing_keywords}
              />
              <AnalysisReport result={result} />
              <OptimizedResume
                text={result.optimized_resume}
                changes={result.changes_summary}
                changeReasons={result.change_reasons}
                truthfulnessNotes={result.truthfulness_notes}
              />
              <CoverLetterPanel
                resumeText={result.optimized_resume}
                jobDescription={result.job_description_used || ""}
                controls={result.rewrite_controls}
              />
              <DownloadButton optimizedResume={result.optimized_resume} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
