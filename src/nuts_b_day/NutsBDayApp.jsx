import { useEffect, useState } from "react";
import { api } from "../shared/api.js";
import ChildhoodMemories from "./ChildhoodMemories.jsx";
import Crown from "./Crown.jsx";
import { GIFT_FOLDERS, GiftFolder, GiftsHome } from "./Gifts.jsx";
import "./nuts_b_day.css";

// Every screen is addressed by the URL hash (#gifts, #gifts/lego, ...), so
// the browser's own Back steps up a level. There are deliberately no links
// or back buttons anywhere on this page.
const APPS = [
  {
    key: "childhood-memories",
    label: "Childhood Memories",
    desc: "A look back.",
    covers: [
      ["childhood-memories", "01-donut-girl.jpg"],
      ["childhood-memories", "07-mother-daughter.jpg"],
      ["childhood-memories", "22-window-trio.jpg"],
    ],
  },
  {
    key: "gifts",
    label: "Gifts",
    desc: "Wrapped with love.",
    covers: [
      ["gifts-records", "Nutcracker Record.jpg"],
      ["gifts-partnership", "Waterman 1.jpg"],
      ["gifts-clayface", "ClayFace And Batman.jpg"],
    ],
  },
];

function readRoute() {
  const [app, sub] = window.location.hash.slice(1).split("/");
  if (app === "childhood-memories") return { app };
  if (app === "gifts") {
    return GIFT_FOLDERS.some((f) => f.slug === sub) ? { app, sub } : { app };
  }
  return { app: null };
}

function renderRoute(route) {
  if (route.app === "childhood-memories") return <ChildhoodMemories />;
  if (route.app === "gifts") return route.sub ? <GiftFolder slug={route.sub} /> : <GiftsHome />;
  return null;
}

export default function NutsBDayApp() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route.app) {
    return <main className="nuts-page">{renderRoute(route)}</main>;
  }

  return (
    <main className="nuts-page nuts-home">
      <figure className="nuts-feature fade-up">
        <span className="nuts-feature-photo">
          <img src={api.nutsPhotoUrl("nuts-hero", "nut.jpg")} alt="" className="nuts-feature-img" />
          <Crown className="nuts-crown" />
        </span>
      </figure>

      <div className="nuts-apps fade-up">
        {APPS.map((a) => (
          <button
            key={a.key}
            className="nuts-app"
            onClick={() => {
              window.location.hash = a.key;
            }}
          >
            <span className="nuts-app-covers" aria-hidden="true">
              {a.covers.map(([set, name], i) => (
                <img key={name} src={api.nutsPhotoUrl(set, name)} alt="" style={{ "--i": i }} />
              ))}
            </span>
            <span className="nuts-app-text">
              <span className="nuts-app-label display-font">{a.label}</span>
              <span className="nuts-app-desc">{a.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
