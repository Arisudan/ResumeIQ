import { useEffect, useMemo, useState } from "react";

const RADIUS = 58;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ScoreCard({ score, matched, missing, total }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 120);
    return () => clearTimeout(timer);
  }, [score]);

  const scoreColor = useMemo(() => {
    if (score >= 80) return "var(--accent2)";
    if (score >= 50) return "#f0c040";
    return "var(--danger)";
  }, [score]);

  const dashOffset = CIRCUMFERENCE - (animatedScore / 100) * CIRCUMFERENCE;

  return (
    <section className="card">
      <h2 className="panel-title">ATS Compatibility</h2>
      <div className="score-ring">
        <svg viewBox="0 0 140 140" role="img" aria-label={`ATS score ${score}`}>
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="12"
          />
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke={scoreColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1.1s ease, stroke 0.3s ease" }}
          />
        </svg>
        <div className="score-value">{score}</div>
      </div>

      <div className="score-subtext">{matched.length} / {total} keywords matched</div>

      <div className="stat-row">
        <div className="stat-box">
          <strong>{score}</strong>
          <span>ATS Score</span>
        </div>
        <div className="stat-box">
          <strong>{matched.length}</strong>
          <span>Matched</span>
        </div>
        <div className="stat-box">
          <strong>{missing.length}</strong>
          <span>Missing</span>
        </div>
      </div>
    </section>
  );
}

export default ScoreCard;
