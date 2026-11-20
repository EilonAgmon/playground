import { useState } from "react";
import { Header } from "../shared/Header.jsx";
import ChildhoodMemories from "./ChildhoodMemories.jsx";
import "./nuts_b_day.css";

const APPS = [
  {
    key: "childhood-memories",
    label: "Childhood Memories",
    desc: "A look back.",
    render: () => <ChildhoodMemories />,
  },
];

export default function NutsBDayApp() {
  const [screen, setScreen] = useState(null);

  const activeApp = APPS.find((a) => a.key === screen);

  if (activeApp) {
    return (
      <>
        <Header title={activeApp.label} />
        <div className="nuts-app-screen">
          <button className="nuts-back" onClick={() => setScreen(null)}>
            &larr; all apps
          </button>
          {activeApp.render()}
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div id="nutsLauncher">
        <div className="nuts-grid">
          {APPS.map((a) => (
            <button key={a.key} className="nuts-card" onClick={() => setScreen(a.key)}>
              <span className="nuts-card-label">{a.label}</span>
              <span className="nuts-card-desc">{a.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
