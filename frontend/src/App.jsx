import { useState } from "react";
import "./App.css";
import { apiUrl, authHeaders } from "./api";
import { runStaticAnalysis } from "./localEngine";
import AnalysisReport from "./components/AnalysisReport";
import AuthPanel from "./components/AuthPanel";
import CoverLetterPanel from "./components/CoverLetterPanel";
import DownloadButton from "./components/DownloadButton";
import HistoryPanel from "./components/HistoryPanel";
import KeywordPanel from "./components/KeywordPanel";
import OptimizedResume from "./components/OptimizedResume";
import ScoreCard from "./components/ScoreCard";
import UploadSection from "./components/UploadSection";

function GeminiNanaBananaCard({ result, staticOnlyMode }) {
  const controls = result.rewrite_controls || {};
  const quickTips = (result.recommendations || []).slice(0, 3);

  return (
    <section className="card gemini-coach">
      <div className="coach-head">
        <p className="coach-kicker">Gemini Nana Banana Coach</p>
        <span className={`coach-pill ${staticOnlyMode ? "local" : "live"}`}>
          {staticOnlyMode ? "Preview Mode" : "Gemini Live"}
        </span>
      </div>
      <h2 className="panel-title">What to change first for the biggest score jump</h2>

      <div className="coach-chip-row">
        <span className="coach-chip">Role: {controls.role_template || "software"}</span>
        <span className="coach-chip">Tone: {controls.tone || "professional"}</span>
        <span className="coach-chip">Length: {controls.length_mode || "balanced"}</span>
        <span className="coach-chip">Region: {controls.region_style || "US"}</span>
      </div>

      <ul className="changes-list" style={{ marginBottom: 0 }}>
        {quickTips.length ? (
          quickTips.map((tip, index) => <li key={`${tip}-${index}`}>{tip}</li>)
        ) : (
          <li>Use measurable outcomes in bullets and keep keywords naturally placed.</li>
        )}
      </ul>

      <p className="helper-text" style={{ marginTop: "12px" }}>
        {staticOnlyMode
          ? "Connect your backend API to unlock live Gemini rewrites and cover-letter generation."
          : "This guidance is generated with your Gemini-backed analysis context."}
      </p>
    </section>
  );
}

function App() {
  const staticOnlyMode = !import.meta.env.VITE_API_BASE_URL;
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
      if (staticOnlyMode) {
        const resumeFile = formData.get("resume_file");
        const jobDescription = formData.get("job_description") || "";
        const controls = {
          role_template: formData.get("role_template") || "software",
          tone: formData.get("tone") || "professional",
          length_mode: formData.get("length_mode") || "balanced",
          target_seniority: formData.get("target_seniority") || "auto",
          strictness: formData.get("strictness") || "strict",
          region_style: formData.get("region_style") || "US",
          language: formData.get("language") || "English",
        };

        const localResult = await runStaticAnalysis({
          file: resumeFile,
          jobDescription,
          controls,
        });
        setResult(localResult);
        return;
      }

      const response = await fetch(apiUrl("/analyze"), {
        method: "POST",
        headers: authHeaders(token),
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
    <div className="app app-shell">
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="hero-eyebrow">AI Resume Intelligence Studio</p>
          <h1>ResumeIQ</h1>
          <p className="subtitle">A resume lab that explains your score, fixes weak sections, and helps you apply faster.</p>
          <div className="hero-tag-row">
            <span className="hero-tag">ATS-first analysis</span>
            <span className="hero-tag">Gemini-powered rewrites</span>
            <span className="hero-tag">One-click DOCX export</span>
          </div>
        </div>
        <div className="hero-orb" aria-hidden="true">
          <div className="orb-ring" />
          <div className="orb-core">NANA<br />BANANA</div>
        </div>
      </header>

      {error && <div className="global-error">{error}</div>}

      <main className="main-grid">
        <div className="stack">
          {!staticOnlyMode && <AuthPanel token={token} user={user} onAuth={handleAuth} onLogout={handleLogout} />}
          <UploadSection onSubmit={handleAnalyze} loading={loading} />
          {!staticOnlyMode && <HistoryPanel token={token} />}
        </div>

        <div className="stack">
          {result && (
            <>
              <ScoreCard
                score={result.score}
                matched={result.matched_keywords}
                missing={result.missing_keywords}
                total={result.total_job_keywords}
              />
              <GeminiNanaBananaCard result={result} staticOnlyMode={staticOnlyMode} />
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
              {!staticOnlyMode && (
                <CoverLetterPanel
                  resumeText={result.optimized_resume}
                  jobDescription={result.job_description_used || ""}
                  controls={result.rewrite_controls}
                />
              )}
              <DownloadButton optimizedResume={result.optimized_resume} staticOnlyMode={staticOnlyMode} />
            </>
          )}

          {!result && !loading && (
            <section className="card empty-state">
              <p className="coach-kicker">Quick Start</p>
              <h2 className="panel-title">Drop resume, paste JD, run analysis</h2>
              <div className="empty-grid">
                <div className="empty-item">
                  <strong>1. Upload</strong>
                  <span>Add PDF, DOCX, or TXT resume.</span>
                </div>
                <div className="empty-item">
                  <strong>2. Analyze</strong>
                  <span>Get ATS score, keyword gaps, and risk signals.</span>
                </div>
                <div className="empty-item">
                  <strong>3. Optimize</strong>
                  <span>Apply suggestions and export optimized DOCX.</span>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
