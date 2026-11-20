import { useEffect, useRef, useState } from "react";
import { api } from "../shared/api.js";
import "./childhood-memories.css";

const SET_KEY = "childhood-memories";
// Deterministic pseudo-random tilt per card so the grid reads as scattered
// photos on a table rather than a rigid grid, without jittering on re-render.
const TILT = (i) => `${(((i * 53) % 9) - 4) * 0.7}deg`;

export default function ChildhoodMemories() {
  const [filenames, setFilenames] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.nutsPhotoList(SET_KEY).then((data) => {
      if (!cancelled) setFilenames(data.photos || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (openIndex === null || !filenames) return;
    function onKey(e) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i + 1) % filenames.length);
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i - 1 + filenames.length) % filenames.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, filenames]);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) setOpenIndex((i) => (i + 1) % filenames.length);
      else setOpenIndex((i) => (i - 1 + filenames.length) % filenames.length);
    }
    touchStartX.current = null;
  }

  if (filenames === null) {
    return <p className="cm-loading">Loading memories…</p>;
  }

  if (filenames.length === 0) {
    return (
      <div className="cm-page">
        <div className="cm-empty">
          <p>No memories here yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cm-page">
      <figure className="cm-feature fade-up">
        <img src={api.nutsPhotoUrl("nuts-hero", "nut.jpg")} alt="" className="cm-feature-img" />
      </figure>

      <div className="cm-hero fade-up">
        <p className="cm-eyebrow">a look back</p>
        <h1 className="cm-title display-font">Childhood Memories</h1>
        <p className="cm-subtitle">A few that made it through the years.</p>
      </div>

      <div className="cm-gallery fade-up">
        {filenames.map((name, i) => (
          <button
            key={name}
            className="cm-polaroid"
            style={{ "--tilt": TILT(i) }}
            onClick={() => setOpenIndex(i)}
          >
            <span className="cm-polaroid-photo">
              <img src={api.nutsPhotoUrl(SET_KEY, name)} alt="" />
            </span>
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="cm-lightbox"
          onClick={() => setOpenIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            className="cm-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIndex((i) => (i - 1 + filenames.length) % filenames.length);
            }}
            aria-label="Previous photo"
          >
            &#8249;
          </button>

          <div className="cm-lightbox-frame" onClick={(e) => e.stopPropagation()}>
            <img
              key={openIndex}
              src={api.nutsPhotoUrl(SET_KEY, filenames[openIndex])}
              alt=""
              className="cm-lightbox-img"
            />
            <p className="cm-counter">
              {openIndex + 1} / {filenames.length}
            </p>
          </div>

          <button
            className="cm-nav next"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIndex((i) => (i + 1) % filenames.length);
            }}
            aria-label="Next photo"
          >
            &#8250;
          </button>

          <button className="cm-close" onClick={() => setOpenIndex(null)} aria-label="Close">
            &times;
          </button>

          <div className="cm-filmstrip" onClick={(e) => e.stopPropagation()}>
            {filenames.map((name, i) => (
              <button
                key={name}
                className={`cm-filmstrip-thumb ${i === openIndex ? "active" : ""}`}
                onClick={() => setOpenIndex(i)}
              >
                <img src={api.nutsPhotoUrl(SET_KEY, name)} alt="" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
