import { useEffect, useState } from "react";
import { api } from "../shared/api.js";
import Lightbox from "./Lightbox.jsx";
import "./childhood-memories.css";
import "./gifts.css";

// One entry per folder in the original "gifts" folder. title is the folder
// name exactly; photos live in the nuts_photos table under "gifts-<slug>",
// shown in filename order. Photos have no captions; only folders are named.
export const GIFT_FOLDERS = [
  { slug: "clayface", title: "Clayface", cover: "ClayFace And Batman.jpg" },
  { slug: "grandparents-gifts", title: "Grandparents gifts", cover: "Pug Santa Swearshirt.jpg" },
  { slug: "lego", title: "Lego", cover: "Disney Lego.jpg" },
  { slug: "nautical-knowledge", title: "Nautical Knowledge", cover: "Reef Fish.jpg" },
  { slug: "partnership", title: "Partnership", cover: "Waterman 1.jpg" },
  { slug: "records", title: "Records", cover: "Nutcracker Record.jpg" },
];

const setKey = (slug) => `gifts-${slug}`;
const plural = (n) => `${n} ${n === 1 ? "gift" : "gifts"}`;

export function GiftsHome() {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    let cancelled = false;
    GIFT_FOLDERS.forEach((f) => {
      api.nutsPhotoList(setKey(f.slug)).then((data) => {
        if (!cancelled) setCounts((c) => ({ ...c, [f.slug]: (data.photos || []).length }));
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="cm-page">
      <div className="cm-hero fade-up">
        <p className="cm-eyebrow">wrapped with love</p>
        <h1 className="cm-title display-font">Gifts</h1>
        <p className="cm-subtitle">Pick a box to open it.</p>
      </div>

      <div className="gf-folders fade-up">
        {GIFT_FOLDERS.map((f) => (
          <button
            key={f.slug}
            className="gf-folder"
            onClick={() => {
              window.location.hash = `gifts/${f.slug}`;
            }}
          >
            <span className="gf-folder-cover">
              <img src={api.nutsPhotoUrl(setKey(f.slug), f.cover)} alt="" loading="lazy" />
              <span className="gf-ribbon" aria-hidden="true" />
            </span>
            <span className="gf-folder-text">
              <span className="gf-folder-title display-font">{f.title}</span>
              {counts[f.slug] != null && <span className="gf-folder-count">{plural(counts[f.slug])}</span>}
            </span>
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
        <p className="cm-eyebrow">gifts</p>
        <h1 className="cm-title display-font">{folder.title}</h1>
        {filenames && <p className="cm-subtitle">{plural(filenames.length)}</p>}
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
