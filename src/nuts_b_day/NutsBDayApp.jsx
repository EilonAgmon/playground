import { useEffect, useState } from "react";
import { api } from "../shared/api.js";
import ChildhoodMemories from "./ChildhoodMemories.jsx";
import "./nuts_b_day.css";

// Each app is opened via the URL hash (#childhood-memories), so the
// browser's own Back returns to the main page. There are deliberately no
// links or back buttons anywhere on this page.
const APPS = [
  {
    key: "childhood-memories",
    label: "Childhood Memories",
    desc: "A look back.",
    covers: ["01-donut-girl.jpg", "07-mother-daughter.jpg", "22-window-trio.jpg"],
    render: () => <ChildhoodMemories />,
  },
];

function currentScreen() {
  const key = window.location.hash.slice(1);
  return APPS.some((a) => a.key === key) ? key : null;
}

export default function NutsBDayApp() {
  const [screen, setScreen] = useState(currentScreen);

  useEffect(() => {
    const onHash = () => {
      setScreen(currentScreen());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const activeApp = APPS.find((a) => a.key === screen);

  if (activeApp) {
    return <main className="nuts-page">{activeApp.render()}</main>;
  }

  return (
    <main className="nuts-page nuts-home">
      <figure className="nuts-feature fade-up">
        <img src={api.nutsPhotoUrl("nuts-hero", "nut.jpg")} alt="" className="nuts-feature-img" />
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
              {a.covers.map((name, i) => (
                <img key={name} src={api.nutsPhotoUrl(a.key, name)} alt="" style={{ "--i": i }} />
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
