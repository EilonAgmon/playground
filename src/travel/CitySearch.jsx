import { useEffect, useState } from "react";
import { api } from "../shared/api.js";
import { useDebouncedValue } from "./useDebouncedValue.js";

export default function CitySearch({ onSelect }) {
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
    <div id="citySearchScreen" className="searchScreen">
      <h1 className="glow display-font">TRAVEL</h1>
      <p className="hint">search for a city or country to start your list</p>

      <div className="searchBox">
        <input
          type="text"
          placeholder="e.g. Amsterdam"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && <p className="searching">searching&hellip;</p>}
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

      <p className="back">
        <a href="../">&larr; back to the portal</a>
      </p>
    </div>
  );
}
