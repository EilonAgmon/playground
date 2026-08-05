export default function SavedList({ items, onDelete }) {
  if (!items.length) {
    return <p className="empty">no attractions saved yet — search above to add one</p>;
  }

  return (
    <ul className="savedList">
      {items.map((item) => {
        const link = item.official_url || item.wikipedia_url;
        return (
          <li key={item.id} className="savedItem">
            <a
              className="savedItemLink"
              href={link || undefined}
              target={link ? "_blank" : undefined}
              rel={link ? "noopener" : undefined}
              onClick={(e) => {
                if (!link) e.preventDefault();
              }}
            >
              {item.image_url ? (
                <img src={item.image_url} alt="" className="thumb" />
              ) : (
                <span className="thumb thumbPlaceholder" aria-hidden="true" />
              )}
              <span className="savedItemInfo">
                <span className="savedItemTitle">{item.title}</span>
                {item.extract && <span className="savedItemExtract">{item.extract.slice(0, 140)}&hellip;</span>}
              </span>
            </a>
            <button
              type="button"
              className="deleteBtn"
              title="remove"
              onClick={() => onDelete(item.id)}
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}
