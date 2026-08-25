import { Anchor, Text, Title } from "@mantine/core";
import {
  HqIcon,
  WheelsIcon,
  ReelsIcon,
  PongIcon,
  VineIcon,
  RicochetIcon,
  PlotIcon,
  GlobeIcon,
  TickersIcon,
  PcaIcon,
  AboutIcon,
} from "../shared/Icons.jsx";
import "./portal.css";

const APPS = [
  { href: "hq/", label: "HQ", desc: "Run your own engineering org.", Icon: HqIcon },
  { href: "wheels/", label: "Wheels", desc: "A tavern dice game, Sea of Stars style.", Icon: WheelsIcon },
  { href: "reels/", label: "Reels", desc: "An original harvest-themed slot machine.", Icon: ReelsIcon },
  { href: "pong/", label: "Pong", desc: "The original arcade classic.", Icon: PongIcon },
  { href: "vine/", label: "Vine", desc: "A Snake homage — grow a garden vine.", Icon: VineIcon },
  { href: "ricochet/", label: "Ricochet", desc: "A Breakout homage — clear every brick.", Icon: RicochetIcon },
  { href: "plot/", label: "Plot", desc: "Plan a companion-planted garden bed.", Icon: PlotIcon },
  { href: "globe/", label: "Globe", desc: "Track the countries you've visited.", Icon: GlobeIcon },
  { href: "tickers/", label: "Tickers", desc: "Today's biggest NYSE & NASDAQ decliners, live.", Icon: TickersIcon },
  { href: "pca/", label: "PCA", desc: "A point-and-click adventure, in progress.", Icon: PcaIcon },
  { href: "about/", label: "About", desc: "Experience, education, background.", Icon: AboutIcon },
];

export default function Portal() {
  return (
    <div id="portal">
      <div className="portal-hero fade-up">
        <Title order={1} className="display-font portal-title">
          Eilon Agmon
        </Title>
        <Text className="portal-tagline">
          Engineering leader. Occasional game developer. Full-time playground builder.
        </Text>
      </div>

      <div className="portal-grid">
        {APPS.map(({ href, label, desc, Icon }, i) => (
          <a key={href} href={href} className="portal-card fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <Icon size={26} />
            <span className="portal-card-label">{label}</span>
            <span className="portal-card-desc">{desc}</span>
          </a>
        ))}
      </div>

      <Anchor
        href="https://github.com/EilonAgmon"
        target="_blank"
        rel="noopener"
        id="identity"
        underline="hover"
      >
        github.com/EilonAgmon
      </Anchor>
    </div>
  );
}
