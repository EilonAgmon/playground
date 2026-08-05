import { useEffect, useState } from "react";
import { api } from "../shared/api.js";
import { useDebouncedValue } from "./useDebouncedValue.js";

export default function AttractionSearch({ city, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const debouncedQuery = useDebouncedValue(query, 450);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.searchAttractions(q, city).then((data) => {
      if (!cancelled) {
        setResults(data.results || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, city]);

  async function handleAdd(result) {
    setAdding(result.title);
    await onAdd(result);
    setAdding(null);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="attractionSearch">
      <input
        type="text"
        placeholder='search an attraction, e.g. "Van Gogh Museum"'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <p className="searching">searching&hellip;</p>}
      {results.length > 0 && (
        <ul className="dropdown attractionDropdown">
          {results.map((r) => (
            <li key={r.title}>
              <button type="button" disabled={adding === r.title} onClick={() => handleAdd(r)}>
                {r.image ? (
                  <img src={r.image} alt="" className="thumb" />
                ) : (
                  <span className="thumb thumbPlaceholder" aria-hidden="true" />
                )}
                <span className="attractionInfo">
                  <span className="attractionTitle">{r.title}</span>
                  {r.extract && <span className="attractionExtract">{r.extract.slice(0, 120)}&hellip;</span>}
                </span>
                <span className="addLabel">{adding === r.title ? "adding…" : "+ add"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
