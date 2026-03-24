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
import logoCore from "./assets/logo.png";
import logoMain from "./assets/logo-main.png";

function App() {
  const staticOnlyMode = !import.meta.env.VITE_API_BASE_URL;
  const [currentPage, setCurrentPage] = useState("upload");
  const [result, setResult] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState("breakdown");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [formProgress, setFormProgress] = useState({ hasFile: false, hasJobDescription: false });
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
    setHasDownloaded(false);

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
        setCurrentPage("report");
        window.location.hash = "report";
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
      setCurrentPage("report");
      window.location.hash = "report";
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

  useEffect(() => {
    const onHashChange = () => {
      const canShowReport = window.location.hash === "#report" && Boolean(result);
      setCurrentPage(canShowReport ? "report" : "upload");
      if (!canShowReport && window.location.hash === "#report") {
        window.location.hash = "upload";
      }
    };

    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [result]);

  const resultTabs = [
    { key: "breakdown", label: "Overview" },
    { key: "keywords", label: "Keywords" },
    { key: "resume", label: "Resume" },
    ...(!staticOnlyMode ? [{ key: "cover", label: "Cover Letter" }] : []),
  ];

  const jumpTo = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const matchedCount = (result?.matched_keywords || []).length;
  const missingCount = (result?.missing_keywords || []).length;
  const deltaScore = result?.score_improvement_estimate?.delta ?? 0;

  const quickSteps = [
    {
      title: "Upload",
      desc: "Add PDF, DOCX, or TXT resume.",
      complete: formProgress.hasFile,
    },
    {
      title: "Analyze",
      desc: "Get ATS score, keyword gaps, and risk signals.",
      complete: Boolean(result),
    },
    {
      title: "Optimize",
      desc: "Apply suggestions and export optimized DOCX or PDF.",
      complete: Boolean(result) && (hasDownloaded || activeResultTab === "resume"),
    },
  ];

  const goToUploadPage = () => {
    setCurrentPage("upload");
    window.location.hash = "upload";
  };

  const goToReportPage = () => {
    if (!result) return;
    setCurrentPage("report");
    window.location.hash = "report";
  };

  return (
    <div className="app app-shell">
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="hero-eyebrow">Interactive Resume Intelligence</p>
          <img className="hero-title-logo" src={logoMain} alt="ResumeIQ AI-Powered Resume Analyzer" />
          <p className="subtitle">A resume lab that explains your score, fixes weak sections, and helps you apply faster.</p>
          <div className="hero-tag-row">
            <span className="hero-tag">ATS-first analysis</span>
            <span className="hero-tag">Gemini-powered rewrites</span>
            <span className="hero-tag">One-click DOCX export</span>
          </div>
        </div>
        <div className="hero-orb" aria-hidden="true">
          <div className="orbit-ring">
            <div className="orbit-item orbit-item-one">
              <span className="orbit-chip">Live ATS Preview</span>
            </div>
            <div className="orbit-item orbit-item-two">
              <span className="orbit-chip">Keyword Match Graph</span>
            </div>
            <div className="orbit-item orbit-item-three">
              <span className="orbit-chip">Smart Rewrite Suggestions</span>
            </div>
          </div>
          <div className="orb-core">
            <img className="center-core-logo" src={logoCore} alt="ResumeIQ logo" />
          </div>
        </div>
      </header>

      {error && <div className="global-error">{error}</div>}

      {currentPage === "upload" ? (
        <main className="main-layout page-enter">
          <section id="setup-section" className={`setup-grid ${staticOnlyMode ? "no-side" : ""}`}>
            <div className="setup-main">
              <UploadSection
                onSubmit={handleAnalyze}
                loading={loading}
                onProgressChange={(progress) => setFormProgress(progress)}
              />
            </div>
            {!staticOnlyMode && (
              <div className="setup-side">
                <AuthPanel token={token} user={user} onAuth={handleAuth} onLogout={handleLogout} />
                <HistoryPanel token={token} />
              </div>
            )}
            <section className="card setup-guide">
              <p className="coach-kicker">Quick Start</p>
              <h2 className="panel-title">Drop resume, paste JD, run analysis</h2>
              <div className="live-meter">
                <span className="live-dot" />
                <strong>Interactive mode active</strong>
                <small>{loading ? "Running analysis pulse..." : "Waiting for your next action"}</small>
              </div>
              <div className="guide-list">
                {quickSteps.map((step, index) => (
                  <div key={step.title} className={`guide-step ${step.complete ? "complete" : "pending"}`}>
                    <div className="guide-step-index">{index + 1}</div>
                    <div>
                      <strong>{step.title}</strong>
                      <span>{step.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {result && (
                <button type="button" className="btn-secondary page-switch-btn" onClick={goToReportPage}>
                  Go to Report Page
                </button>
              )}
            </section>
          </section>
        </main>
      ) : (
        <main className="dashboard-shell page-enter">
          <aside className="dashboard-nav-bar" aria-label="Dashboard navigation">
            <div className="dashboard-nav-items">
              <button type="button" className="dashboard-nav-btn" onClick={goToUploadPage}>New Upload</button>
              <button type="button" className="dashboard-nav-btn" onClick={() => jumpTo("workspace-section")}>Analysis</button>
              <button
                type="button"
                className="dashboard-nav-btn"
                onClick={() => {
                  jumpTo("workspace-section");
                  setActiveResultTab("keywords");
                }}
              >
                Keywords
              </button>
              <button
                type="button"
                className="dashboard-nav-btn"
                onClick={() => {
                  jumpTo("workspace-section");
                  setActiveResultTab("resume");
                }}
              >
                Optimized Resume
              </button>
              {!staticOnlyMode && (
                <button
                  type="button"
                  className="dashboard-nav-btn"
                  onClick={() => {
                    jumpTo("workspace-section");
                    setActiveResultTab("cover");
                  }}
                >
                  Cover Letter
                </button>
              )}
            </div>

            <div className="dashboard-kpis">
              <div className="kpi-card animated-card card-delay-1">
                <strong>{result?.score ?? 0}</strong>
                <span>ATS Score</span>
              </div>
              <div className="kpi-card animated-card card-delay-2">
                <strong>{matchedCount}</strong>
                <span>Matched</span>
              </div>
              <div className="kpi-card animated-card card-delay-3">
                <strong>{missingCount}</strong>
                <span>Missing</span>
              </div>
              <div className="kpi-card animated-card card-delay-4">
                <strong>{deltaScore >= 0 ? `+${deltaScore}` : deltaScore}</strong>
                <span>Projected Gain</span>
              </div>
            </div>
          </aside>

          <section className="main-layout">
            <section id="workspace-section" className="card result-workspace result-workspace-full">
              <div className="result-summary-grid">
                <ScoreCard
                  score={result?.score ?? 0}
                  matched={result?.matched_keywords || []}
                  missing={result?.missing_keywords || []}
                  total={result?.total_job_keywords || 0}
                />
                <div className="result-topline">
                  <div>
                    <p className="coach-kicker">AI Report Page</p>
                    <h2 className="panel-title">Your resume scored {result?.score ?? 0} out of 100</h2>
                  </div>
                  <div className="result-top-actions">
                    <span className="result-pill">
                      {(result?.missing_keywords || []).length} missing keywords
                    </span>
                    <DownloadButton optimizedResume={result?.optimized_resume || ""} onDownloaded={() => setHasDownloaded(true)} />
                  </div>
                </div>
              </div>

              <div className="result-tabs" role="tablist" aria-label="Result sections">
                {resultTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`result-tab ${activeResultTab === tab.key ? "active" : ""}`}
                    onClick={() => setActiveResultTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="activity-rail" aria-label="Live activity">
                <div className="activity-track">
                  <span>Resume parsed</span>
                  <span>Sections weighted</span>
                  <span>Keywords clustered</span>
                  <span>Rewrite engine tuned</span>
                  <span>Export ready</span>
                  <span>Resume parsed</span>
                  <span>Sections weighted</span>
                  <span>Keywords clustered</span>
                </div>
              </div>

              {activeResultTab === "breakdown" && result && <AnalysisReport result={result} />}
              {activeResultTab === "keywords" && (
                <KeywordPanel
                  matched={result?.matched_keywords || []}
                  missing={result?.missing_keywords || []}
                />
              )}
              {activeResultTab === "resume" && (
                <OptimizedResume
                  text={result?.optimized_resume || ""}
                  changes={result?.changes_summary || []}
                  changeReasons={result?.change_reasons || []}
                  truthfulnessNotes={result?.truthfulness_notes || []}
                />
              )}
              {!staticOnlyMode && activeResultTab === "cover" && (
                <CoverLetterPanel
                  resumeText={result?.optimized_resume || ""}
                  jobDescription={result?.job_description_used || ""}
                  controls={result?.rewrite_controls || {}}
                />
              )}
            </section>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
