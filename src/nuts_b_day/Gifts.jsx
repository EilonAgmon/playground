import { useEffect, useState } from "react";
import { api } from "../shared/api.js";
import Lightbox from "./Lightbox.jsx";
import "./childhood-memories.css";
import "./gifts.css";

// One entry per folder in the original "gifts" folder. title is the folder
// name exactly; photos live in the nuts_photos table under "gifts-<slug>",
// shown in filename order. Folders are drawn as wrapped presents (no photo);
// wrap is the paper colour and ribbon the ribbon colour.
export const GIFT_FOLDERS = [
  { slug: "clayface", title: "Clayface", wrap: "#8f2d2a", ribbon: "#e9c46a" },
  { slug: "grandparents-gifts", title: "Grandparents gifts", wrap: "#2f5d46", ribbon: "#f1e3c6" },
  { slug: "lego", title: "Lego", wrap: "#2b4a7a", ribbon: "#e76f51" },
  { slug: "nautical-knowledge", title: "Nautical Knowledge", wrap: "#1f6f78", ribbon: "#f4d9a6" },
  { slug: "partnership", title: "Partnership", wrap: "#5b3a6b", ribbon: "#e9c46a" },
  { slug: "records", title: "Records", wrap: "#a8572a", ribbon: "#f6ead6" },
];

const setKey = (slug) => `gifts-${slug}`;

function Bow({ color }) {
  return (
    <svg className="gf-bow" viewBox="0 0 80 40" aria-hidden="true">
      <path d="M40 28 C30 8, 6 2, 6 18 C6 30, 26 30, 40 28 Z" fill={color} />
      <path d="M40 28 C50 8, 74 2, 74 18 C74 30, 54 30, 40 28 Z" fill={color} />
      <path d="M40 28 L30 40 L34 40 L40 32 Z M40 28 L50 40 L46 40 L40 32 Z" fill={color} />
      <path d="M14 16 C18 10, 28 12, 34 22" stroke="rgba(0,0,0,0.18)" strokeWidth="2" fill="none" />
      <path d="M66 16 C62 10, 52 12, 46 22" stroke="rgba(0,0,0,0.18)" strokeWidth="2" fill="none" />
      <ellipse cx="40" cy="27" rx="6" ry="5" fill={color} stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />
    </svg>
  );
}

export function GiftsHome() {
  return (
    <div className="cm-page">
      <div className="cm-hero fade-up">
        <h1 className="cm-title display-font">Gifts</h1>
      </div>

      <div className="gf-folders fade-up">
        {GIFT_FOLDERS.map((f) => (
          <button
            key={f.slug}
            className="gf-present"
            style={{ "--wrap": f.wrap, "--ribbon": f.ribbon }}
            onClick={() => {
              window.location.hash = `gifts/${f.slug}`;
            }}
          >
            <span className="gf-present-box" aria-hidden="true">
              <Bow color={f.ribbon} />
              <span className="gf-present-lid" />
            </span>
            <span className="gf-present-name display-font">{f.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function GiftFolder({ slug }) {
  const folder = GIFT_FOLDERS.find((f) => f.slug === slug);
  const [filenames, setFilenames] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setFilenames(null);
    api.nutsPhotoList(setKey(slug)).then((data) => {
      if (!cancelled) setFilenames(data.photos || []);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const photos = (filenames || []).map((name) => ({ src: api.nutsPhotoUrl(setKey(slug), name) }));

  return (
    <div className="cm-page">
      <div className="cm-hero fade-up">
        <h1 className="cm-title display-font">{folder.title}</h1>
      </div>

      {filenames === null ? (
        <p className="cm-loading">Unwrapping…</p>
      ) : (
        <div className="gf-items fade-up">
          {photos.map((p, i) => (
            <button key={p.src} className="gf-item" onClick={() => setOpenIndex(i)}>
              <span className="gf-item-photo">
                <img src={p.src} alt="" loading="lazy" />
              </span>
            </button>
          ))}
        </div>
      )}

      {openIndex !== null && (
        <Lightbox photos={photos} index={openIndex} onIndex={setOpenIndex} onClose={() => setOpenIndex(null)} />
      )}
    </div>
  );
}
