import { Stack, Title, Text, SimpleGrid, Card, Anchor } from "@mantine/core";
import { PongIcon, TravelIcon } from "../shared/Icons.jsx";
import "./portal.css";

const APPS = [
  { href: "pong/", label: "Pong", Icon: PongIcon },
  { href: "travel/", label: "Travel", Icon: TravelIcon },
];

export default function Portal() {
  return (
    <Stack id="portal" align="center" justify="center" gap="xl">
      <Stack align="center" gap={4}>
        <Title order={1} className="glow portal-title">
          EILON AGMON
        </Title>
        <Text className="tagline">pick an app</Text>
      </Stack>

      <SimpleGrid cols={{ base: 2 }} spacing="lg">
        {APPS.map(({ href, label, Icon }) => (
          <Card key={href} component="a" href={href} className="tile" withBorder padding="lg">
            <Stack align="center" gap="sm">
              <Icon size={44} />
              <Text className="label">{label}</Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      <Anchor
        href="https://github.com/EilonAgmon"
        target="_blank"
        rel="noopener"
        id="identity"
        underline="hover"
      >
        github.com/EilonAgmon
      </Anchor>
    </Stack>
  );
}
