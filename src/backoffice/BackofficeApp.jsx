import { useEffect, useState } from "react";
import { api } from "../shared/api.js";
import Dashboard from "./Dashboard.jsx";
import "./backoffice.css";

const TOKEN_KEY = "pong_backoffice_token";

export default function BackofficeApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [stats, setStats] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.stats(token).then(async (res) => {
      if (cancelled) return;
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        return;
      }
      if (res.ok) setStats(await res.json());
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleLogin(e) {
    e.preventDefault();
    setError(false);
    const res = await api.login(password);
    if (!res.ok) {
      setError(true);
      return;
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setPassword("");
    setToken(data.token);
  }

  function handleLogout() {
    if (token) api.logout(token).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setStats(null);
  }

  if (token && stats) {
    return <Dashboard stats={stats} onLogout={handleLogout} />;
  }

  if (token && !stats) {
    return null;
  }

  return (
    <div id="loginScreen">
      <h1 className="glow display-font">BACKOFFICE</h1>
      <form onSubmit={handleLogin}>
        <input
          type="password"
          placeholder="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">enter</button>
      </form>
      {error && <p className="error">wrong password</p>}
      <p className="back">
        <a href="../">&larr; back to the portal</a>
      </p>
    </div>
  );
}
