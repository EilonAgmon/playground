import { useEffect, useState } from "react";
import { api } from "../shared/api.js";

const SET_KEY = "early-pictures";

export default function EarlyPictures({ token }) {
  const [filenames, setFilenames] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.nutsPhotoList(SET_KEY, token).then((data) => {
      if (!cancelled) setFilenames(data.photos || []);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

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

  if (filenames === null) {
    return <p className="nuts-loading">Loading…</p>;
  }

  if (filenames.length === 0) {
    return (
      <div className="nuts-empty fade-up">
        <p>No photos yet.</p>
        <p className="nuts-empty-hint">
          Upload some with <code>wrangler r2 object put</code> under the <code>early-pictures/</code> prefix
          in the <code>nuts-photos</code> bucket.
        </p>
      </div>
    );
  }

  return (
    <div className="nuts-gallery fade-up">
      {filenames.map((name, i) => (
        <button key={name} className="nuts-thumb" onClick={() => setOpenIndex(i)}>
          <img src={api.nutsPhotoUrl(SET_KEY, name, token)} alt="" loading="lazy" />
        </button>
      ))}

      {openIndex !== null && (
        <div className="nuts-lightbox" onClick={() => setOpenIndex(null)}>
          <button
            className="nuts-lightbox-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIndex((i) => (i - 1 + filenames.length) % filenames.length);
            }}
            aria-label="Previous photo"
          >
            &#8249;
          </button>
          <img
            src={api.nutsPhotoUrl(SET_KEY, filenames[openIndex], token)}
            alt=""
            className="nuts-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="nuts-lightbox-nav next"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIndex((i) => (i + 1) % filenames.length);
            }}
            aria-label="Next photo"
          >
            &#8250;
          </button>
          <button className="nuts-lightbox-close" onClick={() => setOpenIndex(null)} aria-label="Close">
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
