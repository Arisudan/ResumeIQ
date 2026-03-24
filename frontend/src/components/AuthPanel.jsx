import { useState } from "react";
import { apiUrl } from "../api";

function AuthPanel({ token, user, onAuth, onLogout }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(apiUrl(`/auth/${mode}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Authentication failed.");
      }

      const data = await response.json();
      onAuth(data.access_token, data.user);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err.message || "Unable to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  if (token && user) {
    return (
      <section className="card">
        <h2 className="panel-title">Account</h2>
        <div className="helper-text" style={{ marginTop: 0 }}>Signed in as {user.email}</div>
        <div style={{ marginTop: "12px" }}>
          <button type="button" className="btn-secondary" onClick={onLogout}>Sign Out</button>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="panel-title">Login or Register</h2>

      <div className="actions-row" style={{ marginBottom: "8px" }}>
        <button type="button" className="btn-secondary" onClick={() => setMode("login")}>Login</button>
        <button type="button" className="btn-secondary" onClick={() => setMode("register")}>Register</button>
      </div>

      <form onSubmit={submit}>
        <label className="form-label" htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="text-input"
          required
        />

        <label className="form-label" htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="text-input"
          minLength={8}
          required
        />

        {error && <div className="inline-error">{error}</div>}

        <div style={{ marginTop: "12px" }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AuthPanel;
