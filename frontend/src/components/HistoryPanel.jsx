import { useEffect, useState } from "react";

function HistoryPanel({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    if (!token) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/history?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to load history.");
      }

      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err.message || "Unable to fetch history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return null;
  }

  return (
    <section className="card">
      <h2 className="panel-title">Resume History Dashboard</h2>
      <button type="button" className="btn-secondary" onClick={loadHistory} disabled={loading}>
        {loading ? "Refreshing..." : "Refresh History"}
      </button>
      {error && <div className="inline-error">{error}</div>}

      <div className="history-list" style={{ marginTop: "12px" }}>
        {items.length === 0 && !loading ? (
          <div className="helper-text">No analyses saved yet. Run an analysis while signed in.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-head">
                <strong>{item.filename}</strong>
                <span>Score: {item.score}</span>
              </div>
              <div className="helper-text">{new Date(item.created_at).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default HistoryPanel;
