import { useState } from "react";

const MAX_LEN = 20;

export default function LoginGate({ onLogin }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = username.trim().slice(0, MAX_LEN);
    if (!trimmed) {
      setError(true);
      return;
    }
    setError(false);
    onLogin(trimmed);
  }

  return (
    <div id="loginScreen">
      <h1 className="glow display-font">TRAVEL</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="your name"
          maxLength={MAX_LEN}
          autoComplete="off"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button type="submit">enter</button>
      </form>
      {error && <p className="error">enter a name first</p>}
      <p className="back">
        <a href="../">&larr; back to the portal</a>
      </p>
    </div>
  );
}
