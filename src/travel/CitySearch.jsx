import { useEffect, useState } from "react";
import { Stack, Title, Text, TextInput, Anchor } from "@mantine/core";
import { api } from "../shared/api.js";
import { useDebouncedValue } from "./useDebouncedValue.js";

export default function CitySearch({ onSelect, onBack }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 400);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.searchCities(q).then((data) => {
      if (!cancelled) {
        setResults(data.results || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <Stack id="citySearchScreen" className="searchScreen" align="center" justify="center" gap="md">
      <Title order={1} className="glow">
        TRAVEL
      </Title>
      <Text className="hint">search for a city or country to start a list</Text>

      <div className="searchBox">
        <TextInput
          placeholder="e.g. Amsterdam"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && <Text className="searching">searching&hellip;</Text>}
        {results.length > 0 && (
          <ul className="dropdown">
            {results.map((r) => (
              <li key={`${r.city}-${r.country}`}>
                <button type="button" onClick={() => onSelect(r)}>
                  <span className="cityName">{r.city}</span>
                  <span className="countryName">{r.country || "country"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Anchor component="button" type="button" onClick={onBack} className="back" underline="hover">
        &larr; back to my lists
      </Anchor>
    </Stack>
  );
}
