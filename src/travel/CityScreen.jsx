import { Stack, Group, Title, Text, Button, Anchor } from "@mantine/core";
import AttractionSearch from "./AttractionSearch.jsx";
import SavedList from "./SavedList.jsx";

export default function CityScreen({ city, items, loading, onAdd, onDelete, onBackToDashboard }) {
  return (
    <div id="cityScreen">
      <Group justify="space-between" wrap="wrap" className="cityHeader">
        <div>
          <Title order={1} className="glow small">
            {city.city}
          </Title>
          {city.country && <Text className="countryTag">{city.country}</Text>}
        </div>
        <Button variant="outline" onClick={onBackToDashboard}>
          &larr; my lists
        </Button>
      </Group>

      <AttractionSearch city={city.city} onAdd={onAdd} />

      <Stack className="savedSection" gap="sm">
        <Text className="panel-title">saved places</Text>
        {loading ? <Text className="searching">loading&hellip;</Text> : <SavedList items={items} onDelete={onDelete} />}
      </Stack>

      <Anchor href="../" className="back" underline="hover">
        &larr; back to the portal
      </Anchor>
    </div>
  );
}
