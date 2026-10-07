import { useEffect, useRef, useState } from "react";
import { Anchor } from "@mantine/core";
import {
  HqIcon,
  WheelsIcon,
  ReelsIcon,
  PongIcon,
  VineIcon,
  RicochetIcon,
  VolfiedIcon,
  SalvoIcon,
  WickIcon,
  BarrageIcon,
  RedlineIcon,
  CrossingIcon,
  SwarmIcon,
  PlotIcon,
  GlobeIcon,
  TickersIcon,
  PcaIcon,
  AboutIcon,
  RosterIcon,
  ShatterIcon,
  NibbleIcon,
  ComboIcon,
  WaypointIcon,
} from "../shared/Icons.jsx";
import "./portal.css";

const FEATURED = [
  {
    href: "wick/",
    label: "Wick",
    desc: "An original text adventure — a lighthouse automaton, a storm closing in, and a story worth reading twice.",
    Icon: WickIcon,
    badge: "Newest",
  },
  {
    href: "hq/",
    label: "HQ",
    desc: "Run your own engineering org from a 2-person startup toward 45 engineers — hire, ship, weather the incidents.",
    Icon: HqIcon,
    badge: "Flagship",
  },
];

const GAMES = [
  { href: "wheels/", label: "Wheels", desc: "A tavern dice game, Sea of Stars style.", Icon: WheelsIcon },
  { href: "waypoint/", label: "Waypoint", desc: "Dominoes, stamped with a passport instead of pips.", Icon: WaypointIcon },
  { href: "reels/", label: "Reels", desc: "An original harvest-themed slot machine.", Icon: ReelsIcon },
  { href: "roster/", label: "Roster", desc: "Branching manager conversations — 1:1s and hiring calls.", Icon: RosterIcon },
  { href: "pong/", label: "Pong", desc: "The original arcade classic.", Icon: PongIcon },
  { href: "vine/", label: "Vine", desc: "A Snake homage — grow a garden vine.", Icon: VineIcon },
  { href: "ricochet/", label: "Ricochet", desc: "A Breakout homage — clear every brick.", Icon: RicochetIcon },
  { href: "salvo/", label: "Salvo", desc: "A Space Invaders homage — hold the line.", Icon: SalvoIcon },
  { href: "barrage/", label: "Barrage", desc: "A run-and-gun homage — push through, take down the core.", Icon: BarrageIcon },
  { href: "redline/", label: "Redline", desc: "A highway-combat homage — steer, shoot, survive the route.", Icon: RedlineIcon },
  { href: "crossing/", label: "Crossing", desc: "A road-and-river homage — hop across, ride the logs.", Icon: CrossingIcon },
  { href: "swarm/", label: "Swarm", desc: "A formation-shooter homage — anything can peel off and dive.", Icon: SwarmIcon },
  { href: "shatter/", label: "Shatter", desc: "An Asteroids homage — split the rocks, survive the waves.", Icon: ShatterIcon },
  { href: "nibble/", label: "Nibble", desc: "A Pac-Man homage — four ghosts, four very different plans.", Icon: NibbleIcon },
  { href: "combo/", label: "Combo", desc: "A Tetris homage — seven fast-food pieces, clear the lines.", Icon: ComboIcon },
  { href: "volfied/", label: "Volfied", desc: "A Taito homage — carve out territory, dodge the boss.", Icon: VolfiedIcon },
  { href: "pca/", label: "PCA", desc: "A point-and-click adventure, in progress.", Icon: PcaIcon },
];

const TOOLS = [
  { href: "plot/", label: "Plot", desc: "Plan a companion-planted garden bed.", Icon: PlotIcon },
  { href: "globe/", label: "Globe", desc: "Track the countries you've visited.", Icon: GlobeIcon },
  { href: "tickers/", label: "Tickers", desc: "Today's biggest NYSE & NASDAQ decliners, live.", Icon: TickersIcon },
];

const TICKERS = TOOLS.find((app) => app.href === "tickers/");
const WIP_APPS = [...FEATURED, ...GAMES, ...TOOLS.filter((app) => app.href !== "tickers/")];

const STATUS_LINES = [
  "currently growing tomatoes and an eng org",
  "shipped slot games for a living, now building toy ones",
  "eighteen years in, still debugging things that worked five minutes ago",
  "collecting passport stamps between sprints",
  "grows a garden, grows a team, same instinct",
];

function useTypewriter(lines, { typeMs = 45, deleteMs = 25, holdMs = 1800, pauseMs = 300 } = {}) {
  const [lineIndex, setLineIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reducedMotion.current) setText(lines[0]);
  }, [lines]);

  useEffect(() => {
    if (reducedMotion.current) return;
    const current = lines[lineIndex];
    const atFullLine = !deleting && text === current;
    const atEmptyLine = deleting && text === "";
    const delay = atFullLine ? holdMs : atEmptyLine ? pauseMs : deleting ? deleteMs : typeMs;

    const timeout = setTimeout(() => {
      if (atFullLine) {
        setDeleting(true);
      } else if (atEmptyLine) {
        setDeleting(false);
        setLineIndex((i) => (i + 1) % lines.length);
      } else {
        setText(deleting ? current.slice(0, text.length - 1) : current.slice(0, text.length + 1));
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, deleting, lineIndex, lines, typeMs, deleteMs, holdMs, pauseMs]);

  return text;
}

function TiltCard({ href, label, desc, Icon, className = "", badge, iconSize = 26 }) {
  const ref = useRef(null);

  function handleMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--rx", `${(py - 0.5) * -9}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 9}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <a
      href={href}
      ref={ref}
      className={`portal-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {badge && <span className="portal-card-badge">{badge}</span>}
      <Icon size={iconSize} />
      <span className="portal-card-label">{label}</span>
      <span className="portal-card-desc">{desc}</span>
    </a>
  );
}

function Section({ title, apps }) {
  return (
    <div className="portal-section fade-up">
      <p className="portal-section-title">{title}</p>
      <div className="portal-grid">
        {apps.map((app) => (
          <TiltCard key={app.href} {...app} />
        ))}
      </div>
    </div>
  );
}

export default function Portal() {
  const [wipOpen, setWipOpen] = useState(false);
  const statusText = useTypewriter(STATUS_LINES);

  useEffect(() => {
    function handleMove(e) {
      document.documentElement.style.setProperty("--portal-mx", `${e.clientX}px`);
      document.documentElement.style.setProperty("--portal-my", `${e.clientY}px`);
    }
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div id="portal">
      <div className="portal-hero fade-up">
        <h1 className="display-font portal-title">
          <span className="portal-title-glow">Eilon Agmon</span>
        </h1>
        <p className="portal-tagline portal-terminal">
          <span className="portal-prompt">&gt;</span> {statusText}
          <span className="portal-caret" aria-hidden="true" />
        </p>
      </div>

      <Section title="Tools" apps={[TICKERS]} />

      <div className="portal-wip fade-up">
        <button
          type="button"
          className="portal-wip-toggle"
          onClick={() => setWipOpen((open) => !open)}
          aria-expanded={wipOpen}
        >
          {wipOpen ? "Hide" : "WIP — don't judge"}
        </button>
        {wipOpen && <Section title="Everything else (parked for now)" apps={WIP_APPS} />}
      </div>

      <div className="portal-footer fade-up">
        <a href="about/" className="portal-about-link">
          <AboutIcon size={16} />
          About &amp; resume
        </a>
        <Anchor href="https://github.com/EilonAgmon" target="_blank" rel="noopener" id="identity" underline="hover">
          github.com/EilonAgmon
        </Anchor>
      </div>
    </div>
  );
}
