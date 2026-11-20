import { useState } from "react";
import { PasswordInput, Button, Stack, Text } from "@mantine/core";
import { api } from "../shared/api.js";
import { Header } from "../shared/Header.jsx";
import ChildhoodMemories from "./ChildhoodMemories.jsx";
import "./nuts_b_day.css";

const TOKEN_KEY = "nuts_bday_token";

const APPS = [
  {
    key: "childhood-memories",
    label: "Childhood Memories",
    desc: "A look back.",
    render: (token) => <ChildhoodMemories token={token} />,
  },
];

export default function NutsBDayApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setError(false);
    setLoading(true);
    const res = await api.nutsLogin(password);
    setLoading(false);
    if (!res.ok) {
      setError(true);
      return;
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setPassword("");
    setToken(data.token);
  }

  if (!token) {
    return (
      <>
        <Header />
        <Stack id="nutsGate" align="center" justify="center" gap="md">
          <span className="nuts-lock" aria-hidden="true">
            &#128274;
          </span>
          <form onSubmit={handleLogin} className="nuts-gate-form">
            <Stack gap="sm">
              <PasswordInput
                size="lg"
                placeholder="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" size="lg" fullWidth loading={loading}>
                enter
              </Button>
            </Stack>
          </form>
          {error && <Text c="red">wrong password</Text>}
        </Stack>
      </>
    );
  }

  const activeApp = APPS.find((a) => a.key === screen);

  if (activeApp) {
    return (
      <>
        <Header title={activeApp.label} />
        <div className="nuts-app-screen">
          <button className="nuts-back" onClick={() => setScreen(null)}>
            &larr; all apps
          </button>
          {activeApp.render(token)}
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div id="nutsLauncher">
        <div className="nuts-grid">
          {APPS.map((a) => (
            <button key={a.key} className="nuts-card" onClick={() => setScreen(a.key)}>
              <span className="nuts-card-label">{a.label}</span>
              <span className="nuts-card-desc">{a.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
