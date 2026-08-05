import {
  Stack,
  Group,
  Title,
  Text,
  Button,
  Card,
  SimpleGrid,
  RingProgress,
  Center,
  Table,
  ScrollArea,
  Alert,
  Badge,
} from "@mantine/core";

function StatTiles({ totals }) {
  const tiles = [
    { label: "total plays", value: totals.total_plays || 0 },
    { label: "wins", value: totals.wins || 0 },
    { label: "losses", value: totals.losses || 0 },
    { label: "abandoned", value: totals.abandoned || 0 },
  ];
  const wins = totals.wins || 0;
  const losses = totals.losses || 0;
  const decided = wins + losses;
  const winRate = decided ? Math.round((wins / decided) * 100) : 0;

  return (
    <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="md" mb="xl">
      {tiles.map((t) => (
        <Card key={t.label} className="tile" withBorder padding="md">
          <Text className="tile-value">{t.value}</Text>
          <Text className="tile-label">{t.label}</Text>
        </Card>
      ))}
      <Card className="tile" withBorder padding="md">
        <Center>
          <RingProgress
            size={70}
            thickness={6}
            roundCaps
            sections={[{ value: winRate, color: "brand.4" }]}
            label={
              <Text ta="center" size="xs" fw={700}>
                {decided ? `${winRate}%` : "—"}
              </Text>
            }
          />
        </Center>
        <Text className="tile-label" ta="center" mt={4}>
          win rate
        </Text>
      </Card>
    </SimpleGrid>
  );
}

function DayChart({ byDay }) {
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const counts = Object.fromEntries(byDay.map((r) => [r.day, r.count]));
  const max = Math.max(1, ...days.map((d) => counts[d] || 0));

  return (
    <Card className="panel" withBorder mb="lg">
      <Text className="panel-title">plays / day (last 30 days)</Text>
      <div className="chart">
        {days.map((day) => {
          const count = counts[day] || 0;
          const pct = Math.max(2, Math.round((count / max) * 100));
          return (
            <div className="bar" key={day} style={{ height: `${pct}%` }} data-empty={count === 0 ? "true" : undefined}>
              <span className="tip">
                {day}: {count}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CountryBars({ byCountry }) {
  const max = Math.max(1, ...byCountry.map((r) => r.count));
  return (
    <Card className="panel" withBorder mb="lg">
      <Text className="panel-title">top countries</Text>
      <Stack gap="xs">
        {byCountry.map((r) => (
          <div className="row" key={r.country}>
            <span>{r.country}</span>
            <span className="fill-track">
              <span className="fill" style={{ width: `${(r.count / max) * 100}%` }} />
            </span>
            <span className="count">{r.count}</span>
          </div>
        ))}
      </Stack>
    </Card>
  );
}

function RecentTable({ recent }) {
  return (
    <Card className="panel" withBorder mb="lg">
      <Text className="panel-title">recent plays</Text>
      <ScrollArea>
        <Table verticalSpacing="xs" fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>when</Table.Th>
              <Table.Th>location</Table.Th>
              <Table.Th>device</Table.Th>
              <Table.Th>browser / os</Table.Th>
              <Table.Th>referrer</Table.Th>
              <Table.Th>result</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {recent.map((p) => {
              const location = [p.city, p.region, p.country].filter(Boolean).join(", ") || "Unknown";
              const outcomeColor = p.outcome === "win" ? "teal" : p.outcome === "loss" ? "red" : "gray";
              const outcomeText =
                p.outcome === "win"
                  ? `win (${p.player_score}–${p.ai_score})`
                  : p.outcome === "loss"
                  ? `loss (${p.player_score}–${p.ai_score})`
                  : "in progress";
              return (
                <Table.Tr key={p.id}>
                  <Table.Td>{new Date(`${p.created_at}Z`).toLocaleString()}</Table.Td>
                  <Table.Td>{location}</Table.Td>
                  <Table.Td>{p.device_type || "?"}</Table.Td>
                  <Table.Td>
                    {p.browser || "?"} / {p.os || "?"}
                  </Table.Td>
                  <Table.Td>{p.referrer ? p.referrer.slice(0, 40) : "direct"}</Table.Td>
                  <Table.Td>
                    <Badge color={outcomeColor} variant="light" size="sm">
                      {outcomeText}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>
  );
}

export default function Dashboard({ stats, onLogout, onFlushPong, onFlushTravel }) {
  function handleFlushPong() {
    if (window.confirm("Delete ALL Pong play data? This cannot be undone.")) {
      onFlushPong();
    }
  }

  function handleFlushTravel() {
    if (window.confirm("Delete ALL saved Travel items for every user? This cannot be undone.")) {
      onFlushTravel();
    }
  }

  return (
    <div id="dashboard">
      <Group justify="space-between" className="dashboard-header" mb="xl">
        <Title order={1} className="glow small">
          BACKOFFICE
        </Title>
        <Button variant="outline" onClick={onLogout}>
          log out
        </Button>
      </Group>

      <StatTiles totals={stats.totals} />
      <DayChart byDay={stats.byDay} />
      <CountryBars byCountry={stats.byCountry} />
      <RecentTable recent={stats.recent} />

      <Alert color="red" variant="outline" title="danger zone" mt="xl">
        <Group>
          <Button color="red" variant="outline" onClick={handleFlushPong}>
            flush Pong data
          </Button>
          <Button color="red" variant="outline" onClick={handleFlushTravel}>
            flush Travel data
          </Button>
        </Group>
      </Alert>
    </div>
  );
}
