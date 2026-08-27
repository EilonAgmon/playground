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
    if (saved && saved.bedKey && Array.isArray(saved.grid)) {
      // Cells used to just be a crop key string with no growth clock. Treat
      // any of those as instantly mature rather than losing the planting or
      // crashing on the new {key, plantedAt} shape.
      const grid = saved.grid.map((cell) => (typeof cell === "string" ? { key: cell, plantedAt: 0 } : cell));
      return { bedKey: saved.bedKey, grid, harvestCount: saved.harvestCount || 0 };
    }
  } catch {
    // ignore malformed storage
  }
  const bed = BED_SIZES[1];
  return { bedKey: bed.key, grid: emptyGrid(bed), harvestCount: 0 };
}

function growthProgress(cell, now) {
  if (!cell) return 0;
  const growMs = CROP_MAP[cell.key].growSeconds * 1000;
  return Math.min(1, (now - cell.plantedAt) / growMs);
}

function formatCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

function neighborStatus(grid, cols, rows, index) {
  const cell = grid[index];
  if (!cell) return null;
  const crop = CROP_MAP[cell.key];
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
    if (crop.badWith.includes(other.key)) hasBad = true;
    if (crop.goodWith.includes(other.key)) hasGood = true;
  });
  if (hasBad) return "bad";
  if (hasGood) return "good";
  return "neutral";
}

export default function PlotApp() {
  const [{ bedKey, grid, harvestCount }, setState] = useState(loadState);
  const [activeCrop, setActiveCrop] = useState(CROPS[0].key);
  const [hemisphere, setHemisphere] = useState(() => localStorage.getItem(HEMI_KEY) || "NH");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const bed = BED_SIZES.find((b) => b.key === bedKey) || BED_SIZES[1];

  useEffect(() => {
    localStorage.setItem(GRID_KEY, JSON.stringify({ bedKey, grid, harvestCount }));
  }, [bedKey, grid, harvestCount]);

  useEffect(() => {
    localStorage.setItem(HEMI_KEY, hemisphere);
  }, [hemisphere]);

  // Progress is a pure function of (now - plantedAt), so this is the only
  // thing that needs a ticking clock — growth itself keeps accruing in
  // real time whether or not the tab is open, no catch-up logic needed.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const statuses = useMemo(
    () => grid.map((_, i) => neighborStatus(grid, bed.cols, bed.rows, i)),
    [grid, bed.cols, bed.rows]
  );

  function handleBedChange(newBed) {
    setState((prev) => ({ bedKey: newBed.key, grid: emptyGrid(newBed), harvestCount: prev.harvestCount }));
  }

  function handleCellClick(i) {
    setState((prev) => {
      const next = [...prev.grid];
      const cell = next[i];
      if (cell) {
        const cropDef = CROP_MAP[cell.key];
        if (growthProgress(cell, Date.now()) >= 1) {
          next[i] = null;
          setMessage(`Harvested ${cropDef.name}!`);
          return { ...prev, grid: next, harvestCount: prev.harvestCount + 1 };
        }
        if (cell.key === activeCrop) {
          next[i] = null;
          setMessage(`Pulled up the ${cropDef.name.toLowerCase()}.`);
          return { ...prev, grid: next };
        }
      }
      next[i] = { key: activeCrop, plantedAt: Date.now() };
      setMessage(`Planted ${CROP_MAP[activeCrop].name.toLowerCase()}.`);
      return { ...prev, grid: next };
    });
  }

  function handleClear() {
    setState((prev) => ({ ...prev, grid: emptyGrid(bed) }));
    setMessage("Bed cleared.");
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
          <p className="plot-sub">
            Plan a raised bed. Pick a crop, click cells to plant, watch for good and bad neighbors — then check back
            once the ring fills to harvest.
          </p>
        </div>

        <div className="plot-stats fade-up">
          <div className="plot-stat">
            <strong>{harvestCount}</strong>
            <span>harvested</span>
          </div>
          {message && <p className="plot-message">{message}</p>}
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
            {grid.map((cell, i) => {
              const crop = cell ? CROP_MAP[cell.key] : null;
              const status = statuses[i];
              const progress = growthProgress(cell, now);
              const ready = !!cell && progress >= 1;
              const remainingMs = crop ? crop.growSeconds * 1000 - (now - cell.plantedAt) : 0;
              let label = `empty cell, tap to plant ${info.name}`;
              if (crop) label = ready ? `${crop.name}, ready to harvest` : `${crop.name}, ready in ${formatCountdown(remainingMs)}`;
              return (
                <button
                  key={i}
                  className={`plot-cell ${status ? `status-${status}` : ""} ${ready ? "ready" : ""}`}
                  style={crop ? { background: crop.color, "--progress": progress } : undefined}
                  onClick={() => handleCellClick(i)}
                  title={label}
                  aria-label={label}
                >
                  {crop && !ready && <span className="plot-cell-ring" />}
                  {ready && <span className="plot-cell-ready" />}
                </button>
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
              <p className="plot-info-row">
                <span>Grows in</span>
                <span>{formatCountdown(info.growSeconds * 1000)}</span>
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
