import { useEffect, useState } from "react";
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

function App() {
  const staticOnlyMode = !import.meta.env.VITE_API_BASE_URL;
  const [result, setResult] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState("breakdown");
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
        setActiveResultTab("breakdown");
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
      setActiveResultTab("breakdown");
    } catch (err) {
      setError(err.message || "Unexpected error occurred.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!result) {
      setActiveResultTab("breakdown");
    }
  }, [result]);

  const resultTabs = [
    { key: "breakdown", label: "Overview" },
    { key: "keywords", label: "Keywords" },
    { key: "resume", label: "Resume" },
    ...(!staticOnlyMode ? [{ key: "cover", label: "Cover Letter" }] : []),
  ];

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
          <div className="orb-core" />
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
            <div className="result-grid">
              <div className="result-col">
                <ScoreCard
                  score={result.score}
                  matched={result.matched_keywords}
                  missing={result.missing_keywords}
                  total={result.total_job_keywords}
                />

                <section className="card result-workspace">
                  <div className="result-topline">
                    <div>
                      <p className="coach-kicker">Analysis Workspace</p>
                      <h2 className="panel-title">Your resume scored {result.score} out of 100</h2>
                    </div>
                    <div className="result-top-actions">
                      <span className="result-pill">
                        {(result.missing_keywords || []).length} missing keywords
                      </span>
                      <DownloadButton optimizedResume={result.optimized_resume} />
                    </div>
                  </div>

                  <div className="workspace-shell">
                    <aside className="result-rail" role="tablist" aria-label="Analysis sections">
                      {resultTabs.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          className={`result-rail-item ${activeResultTab === tab.key ? "active" : ""}`}
                          onClick={() => setActiveResultTab(tab.key)}
                          aria-current={activeResultTab === tab.key ? "true" : undefined}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </aside>

                    <div className="result-pane">
                      <div className="result-tabs" role="tablist" aria-label="Result sections">
                        {resultTabs.map((tab) => (
                          <button
                            key={`mobile-${tab.key}`}
                            type="button"
                            className={`result-tab ${activeResultTab === tab.key ? "active" : ""}`}
                            onClick={() => setActiveResultTab(tab.key)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {activeResultTab === "breakdown" && <AnalysisReport result={result} />}
                      {activeResultTab === "keywords" && (
                        <KeywordPanel
                          matched={result.matched_keywords}
                          missing={result.missing_keywords}
                        />
                      )}
                      {activeResultTab === "resume" && (
                        <OptimizedResume
                          text={result.optimized_resume}
                          changes={result.changes_summary}
                          changeReasons={result.change_reasons}
                          truthfulnessNotes={result.truthfulness_notes}
                        />
                      )}
                      {!staticOnlyMode && activeResultTab === "cover" && (
                        <CoverLetterPanel
                          resumeText={result.optimized_resume}
                          jobDescription={result.job_description_used || ""}
                          controls={result.rewrite_controls}
                        />
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>
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
