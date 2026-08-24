import { useEffect, useMemo, useState } from "react";
import { Header } from "../shared/Header.jsx";
import { CROPS, CROP_MAP, BED_SIZES } from "./crops.js";
import "./plot.css";

const GRID_KEY = "plot_grid";
const HEMI_KEY = "plot_hemisphere";

function emptyGrid(size) {
  return Array(size.cols * size.rows).fill(null);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(GRID_KEY));
    if (saved && saved.bedKey && Array.isArray(saved.grid)) return saved;
  } catch {
    // ignore malformed storage
  }
  const bed = BED_SIZES[1];
  return { bedKey: bed.key, grid: emptyGrid(bed) };
}

function neighborStatus(grid, cols, rows, index) {
  const cropKey = grid[index];
  if (!cropKey) return null;
  const crop = CROP_MAP[cropKey];
  const row = Math.floor(index / cols);
  const col = index % cols;
  const neighborIdxs = [];
  if (row > 0) neighborIdxs.push(index - cols);
  if (row < rows - 1) neighborIdxs.push(index + cols);
  if (col > 0) neighborIdxs.push(index - 1);
  if (col < cols - 1) neighborIdxs.push(index + 1);

  let hasBad = false;
  let hasGood = false;
  neighborIdxs.forEach((ni) => {
    const other = grid[ni];
    if (!other) return;
    if (crop.badWith.includes(other)) hasBad = true;
    if (crop.goodWith.includes(other)) hasGood = true;
  });
  if (hasBad) return "bad";
  if (hasGood) return "good";
  return "neutral";
}

export default function PlotApp() {
  const [{ bedKey, grid }, setState] = useState(loadState);
  const [activeCrop, setActiveCrop] = useState(CROPS[0].key);
  const [hemisphere, setHemisphere] = useState(() => localStorage.getItem(HEMI_KEY) || "NH");

  const bed = BED_SIZES.find((b) => b.key === bedKey) || BED_SIZES[1];

  useEffect(() => {
    localStorage.setItem(GRID_KEY, JSON.stringify({ bedKey, grid }));
  }, [bedKey, grid]);

  useEffect(() => {
    localStorage.setItem(HEMI_KEY, hemisphere);
  }, [hemisphere]);

  const statuses = useMemo(
    () => grid.map((_, i) => neighborStatus(grid, bed.cols, bed.rows, i)),
    [grid, bed.cols, bed.rows]
  );

  function handleBedChange(newBed) {
    setState({ bedKey: newBed.key, grid: emptyGrid(newBed) });
  }

  function handleCellClick(i) {
    setState((prev) => {
      const next = [...prev.grid];
      next[i] = next[i] === activeCrop ? null : activeCrop;
      return { ...prev, grid: next };
    });
  }

  function handleClear() {
    setState((prev) => ({ ...prev, grid: emptyGrid(bed) }));
  }

  const info = CROP_MAP[activeCrop];
  const sow = hemisphere === "NH" ? info.sowNH : info.sowSH;
  const harvest = hemisphere === "NH" ? info.harvestNH : info.harvestSH;

  return (
    <>
      <Header title="Plot" />
      <div id="plot">
        <div className="plot-hero fade-up">
          <h1 className="display-font plot-title">Plot</h1>
          <p className="plot-sub">Plan a raised bed. Pick a crop, click cells to plant, watch for good and bad neighbors.</p>
        </div>

        <div className="plot-toolbar fade-up">
          <div className="plot-bedsizes">
            {BED_SIZES.map((b) => (
              <button
                key={b.key}
                className={`plot-chip ${b.key === bedKey ? "active" : ""}`}
                onClick={() => handleBedChange(b)}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="plot-hemi">
            <button
              className={`plot-chip ${hemisphere === "NH" ? "active" : ""}`}
              onClick={() => setHemisphere("NH")}
            >
              N. Hemisphere
            </button>
            <button
              className={`plot-chip ${hemisphere === "SH" ? "active" : ""}`}
              onClick={() => setHemisphere("SH")}
            >
              S. Hemisphere
            </button>
          </div>
        </div>

        <div className="plot-layout fade-up">
          <div
            className="plot-grid surface"
            style={{ gridTemplateColumns: `repeat(${bed.cols}, 1fr)` }}
          >
            {grid.map((cropKey, i) => {
              const crop = cropKey ? CROP_MAP[cropKey] : null;
              const status = statuses[i];
              return (
                <button
                  key={i}
                  className={`plot-cell ${status ? `status-${status}` : ""}`}
                  style={crop ? { background: crop.color } : undefined}
                  onClick={() => handleCellClick(i)}
                  title={crop ? crop.name : "empty"}
                  aria-label={crop ? `${crop.name}, tap to remove` : `empty cell, tap to plant ${info.name}`}
                />
              );
            })}
          </div>

          <div className="plot-side">
            <div className="plot-info surface">
              <p className="plot-info-name" style={{ color: info.color }}>
                {info.name}
              </p>
              <p className="plot-info-row">
                <span>Sow</span>
                <span>{sow}</span>
              </p>
              <p className="plot-info-row">
                <span>Harvest</span>
                <span>{harvest}</span>
              </p>
              {info.goodWith.length > 0 && (
                <p className="plot-info-companions good">
                  Good with {info.goodWith.map((k) => CROP_MAP[k].name).join(", ")}
                </p>
              )}
              {info.badWith.length > 0 && (
                <p className="plot-info-companions bad">
                  Avoid near {info.badWith.map((k) => CROP_MAP[k].name).join(", ")}
                </p>
              )}
            </div>

            <button className="plot-clear" onClick={handleClear}>
              Clear bed
            </button>
          </div>
        </div>

        <div className="plot-palette fade-up">
          {CROPS.map((c) => (
            <button
              key={c.key}
              className={`plot-swatch ${c.key === activeCrop ? "active" : ""}`}
              style={{ "--swatch-color": c.color }}
              onClick={() => setActiveCrop(c.key)}
            >
              <span className="plot-swatch-dot" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
