import { PongIcon, TravelIcon } from "../shared/Icons.jsx";
import "./portal.css";

export default function Portal() {
  return (
    <main id="portal">
      <h1 className="glow display-font">EILON AGMON</h1>
      <p className="tagline">pick an app</p>

      <div className="grid">
        <a className="tile" href="pong/">
          <PongIcon />
          <span className="label">Pong</span>
        </a>
        <a className="tile" href="travel/">
          <TravelIcon />
          <span className="label">Travel</span>
        </a>
      </div>

      <footer id="identity">
        <a href="https://github.com/EilonAgmon" target="_blank" rel="noopener">
          github.com/EilonAgmon
        </a>
      </footer>
    </main>
  );
}
