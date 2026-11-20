import { useEffect, useState } from "react";
import { api } from "../shared/api.js";
import Lightbox from "./Lightbox.jsx";
import "./childhood-memories.css";

const SET_KEY = "childhood-memories";
// Photos come back sorted by filename. These are pinned to the end, in
// exactly this order, so the last row reads the way Eilon arranged it.
const LAST = ["22-window-trio.jpg", "21-formal-family.jpg", "20-leopard-costume.jpg", "19-nightcap-bed.jpg"];

function arrange(photos) {
  const last = LAST.filter((name) => photos.includes(name));
  return [...photos.filter((name) => !LAST.includes(name)), ...last];
}
// Deterministic pseudo-random tilt per card so the grid reads as scattered
// photos on a table rather than a rigid grid, without jittering on re-render.
const TILT = (i) => `${(((i * 53) % 9) - 4) * 0.7}deg`;

export default function ChildhoodMemories() {
  const [filenames, setFilenames] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.nutsPhotoList(SET_KEY).then((data) => {
      if (!cancelled) setFilenames(arrange(data.photos || []));
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <Lightbox
          photos={filenames.map((name) => ({ src: api.nutsPhotoUrl(SET_KEY, name) }))}
          index={openIndex}
          onIndex={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}
