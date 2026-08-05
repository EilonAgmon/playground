import { Stack, Group, Title, Text, SimpleGrid, Card, Button, Anchor } from "@mantine/core";
import { cityGradient } from "./cityColor.js";

export default function CityDashboard({ username, cities, loading, onOpenCity, onAddNew, onSwitchUser }) {
  return (
    <Stack id="cityDashboard" gap="lg">
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={1} className="glow small">
            {username}&rsquo;s trips
          </Title>
          <Text className="hint" ta="left">
            {cities.length ? "pick a list to add or remove places" : "start your first list"}
          </Text>
        </div>
        <Group>
          <Button onClick={onAddNew}>+ add new</Button>
          <Button variant="subtle" onClick={onSwitchUser}>
            not {username}?
          </Button>
        </Group>
      </Group>

      {loading ? (
        <Text className="searching">loading&hellip;</Text>
      ) : cities.length === 0 ? (
        <Card className="emptyDashboard" withBorder padding="xl">
          <Text className="empty">
            no saved lists yet &mdash; click <strong>+ add new</strong> to search for a city or country
          </Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="md">
          {cities.map((c) => (
            <Card
              key={`${c.city}-${c.country}`}
              className="cityCard"
              padding="lg"
              style={{ background: cityGradient(c.city) }}
              onClick={() => onOpenCity(c)}
            >
              <Text className="cityCardName">{c.city}</Text>
              {c.country && <Text className="cityCardCountry">{c.country}</Text>}
              <Text className="cityCardCount">
                {c.count} place{c.count === 1 ? "" : "s"} saved
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Anchor href="../" className="back" underline="hover">
        &larr; back to the portal
      </Anchor>
    </Stack>
  );
}
