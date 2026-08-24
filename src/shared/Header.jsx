export function Header({ title, floating = false }) {
  return (
    <header className={floating ? "app-header app-header-floating" : "app-header"}>
      <a href="../" className="app-header-back">
        <span aria-hidden="true">&larr;</span>
        <span>Portal</span>
      </a>
      {title && <span className="app-header-title">{title}</span>}
    </header>
  );
}
