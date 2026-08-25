import { useEffect, useState } from "react";
import { Stack, Title, PasswordInput, Button, Text } from "@mantine/core";
import { api } from "../shared/api.js";
import Dashboard from "./Dashboard.jsx";
import { Header } from "../shared/Header.jsx";
import "./backoffice.css";

const TOKEN_KEY = "pong_backoffice_token";

export default function BackofficeApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [stats, setStats] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  async function reloadStats() {
    const res = await api.stats(token);
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      return;
    }
    if (res.ok) setStats(await res.json());
  }

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

  async function handleFlushPong() {
    await api.flushPong(token);
    reloadStats();
  }

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
    return (
      <Dashboard stats={stats} onLogout={handleLogout} onFlushPong={handleFlushPong} />
    );
  }

  if (token && !stats) {
    return null;
  }

  return (
    <>
      <Header title="Backoffice" />
      <Stack id="loginScreen" align="center" justify="center" gap="md">
        <Title order={1} className="display-font">
          Backoffice
        </Title>
        <form onSubmit={handleLogin}>
          <Stack gap="xs" align="center">
            <PasswordInput
              placeholder="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" fullWidth>
              enter
            </Button>
          </Stack>
        </form>
        {error && <Text c="red">wrong password</Text>}
      </Stack>
    </>
  );
}
