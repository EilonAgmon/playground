function StatTiles({ totals }) {
  const tiles = [
    { label: "total plays", value: totals.total_plays || 0 },
    { label: "wins", value: totals.wins || 0 },
    { label: "losses", value: totals.losses || 0 },
    { label: "abandoned", value: totals.abandoned || 0 },
  ];
  return (
    <section className="tiles">
      {tiles.map((t) => (
        <div className="tile" key={t.label}>
          <div className="value">{t.value}</div>
          <div className="label">{t.label}</div>
        </div>
      ))}
    </section>
  );
}

function DayChart({ byDay }) {
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const counts = Object.fromEntries(byDay.map((r) => [r.day, r.count]));
  const max = Math.max(1, ...days.map((d) => counts[d] || 0));

  return (
    <section className="panel">
      <h2>plays / day (last 30 days)</h2>
      <div className="chart">
        {days.map((day) => {
          const count = counts[day] || 0;
          const pct = Math.max(2, Math.round((count / max) * 100));
          return (
            <div className="bar" key={day} style={{ height: `${pct}%` }} data-empty={count === 0 ? "true" : undefined}>
              <span className="tip">
                {day}: {count}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CountryBars({ byCountry }) {
  const max = Math.max(1, ...byCountry.map((r) => r.count));
  return (
    <section className="panel">
      <h2>top countries</h2>
      <div className="bars">
        {byCountry.map((r) => (
          <div className="row" key={r.country}>
            <span>{r.country}</span>
            <span className="fill-track">
              <span className="fill" style={{ width: `${(r.count / max) * 100}%` }} />
            </span>
            <span className="count">{r.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentTable({ recent }) {
  return (
    <section className="panel">
      <h2>recent plays</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>when</th>
              <th>location</th>
              <th>device</th>
              <th>browser / os</th>
              <th>referrer</th>
              <th>result</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((p) => {
              const location = [p.city, p.region, p.country].filter(Boolean).join(", ") || "Unknown";
              const outcomeClass =
                p.outcome === "win" ? "outcome-win" : p.outcome === "loss" ? "outcome-loss" : "outcome-none";
              const outcomeText =
                p.outcome === "win"
                  ? `win (${p.player_score}–${p.ai_score})`
                  : p.outcome === "loss"
                  ? `loss (${p.player_score}–${p.ai_score})`
                  : "in progress";
              return (
                <tr key={p.id}>
                  <td>{new Date(`${p.created_at}Z`).toLocaleString()}</td>
                  <td>{location}</td>
                  <td>{p.device_type || "?"}</td>
                  <td>
                    {p.browser || "?"} / {p.os || "?"}
                  </td>
                  <td>{p.referrer ? p.referrer.slice(0, 40) : "direct"}</td>
                  <td className={outcomeClass}>{outcomeText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Dashboard({ stats, onLogout, onFlushPong, onFlushTravel }) {
  function handleFlushPong() {
    if (window.confirm("Delete ALL Pong play data? This cannot be undone.")) {
      onFlushPong();
    }
  }

  function handleFlushTravel() {
    if (window.confirm("Delete ALL saved Travel items for every user? This cannot be undone.")) {
      onFlushTravel();
    }
  }

  return (
    <div id="dashboard">
      <header>
        <h1 className="glow small display-font">BACKOFFICE</h1>
        <button onClick={onLogout}>log out</button>
      </header>

      <StatTiles totals={stats.totals} />
      <DayChart byDay={stats.byDay} />
      <CountryBars byCountry={stats.byCountry} />
      <RecentTable recent={stats.recent} />

      <section className="panel dangerZone">
        <h2>danger zone</h2>
        <div className="dangerActions">
          <button className="dangerBtn" onClick={handleFlushPong}>
            flush Pong data
          </button>
          <button className="dangerBtn" onClick={handleFlushTravel}>
            flush Travel data
          </button>
        </div>
      </section>
    </div>
  );
}
