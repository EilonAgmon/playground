import { useState } from "react";
import { Stack, Title, TextInput, Button, Text, Anchor } from "@mantine/core";

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
    <Stack id="loginScreen" align="center" justify="center" gap="md">
      <Title order={1} className="glow">
        TRAVEL
      </Title>
      <form onSubmit={handleSubmit}>
        <Stack gap="xs" align="center">
          <TextInput
            placeholder="your name"
            maxLength={MAX_LEN}
            autoComplete="off"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button type="submit" fullWidth>
            enter
          </Button>
        </Stack>
      </form>
      {error && <Text c="red">enter a name first</Text>}
      <Anchor href="../" className="back" underline="hover">
        &larr; back to the portal
      </Anchor>
    </Stack>
  );
}
