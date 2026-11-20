import { useEffect, useRef } from "react";
import "./childhood-memories.css";

// Full-screen photo viewer shared by every nuts_b_day gallery.
// photos: [{ src }]. Closing only dismisses the viewer; nothing
// here navigates away from the page.
export default function Lightbox({ photos, index, onIndex, onClose }) {
  const touchStartX = useRef(null);
  const count = photos.length;
  const next = () => onIndex((index + 1) % count);
  const prev = () => onIndex((index - 1 + count) % count);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % count);
      if (e.key === "ArrowLeft") onIndex((index - 1 + count) % count);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, onIndex, onClose]);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    touchStartX.current = null;
  }

  const photo = photos[index];

  return (
    <div className="cm-lightbox" onClick={onClose} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {count > 1 && (
        <button
          className="cm-nav prev"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Previous photo"
        >
          &#8249;
        </button>
      )}

      <div className="cm-lightbox-frame" onClick={(e) => e.stopPropagation()}>
        <img key={index} src={photo.src} alt="" className="cm-lightbox-img" />
        {count > 1 && (
          <p className="cm-counter">
            {index + 1} / {count}
          </p>
        )}
      </div>

      {count > 1 && (
        <button
          className="cm-nav next"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Next photo"
        >
          &#8250;
        </button>
      )}

      <button className="cm-close" onClick={onClose} aria-label="Close">
        &times;
      </button>

      {count > 1 && (
        <div className="cm-filmstrip" onClick={(e) => e.stopPropagation()}>
          {photos.map((p, i) => (
            <button
              key={p.src}
              className={`cm-filmstrip-thumb ${i === index ? "active" : ""}`}
              onClick={() => onIndex(i)}
            >
              <img src={p.src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
