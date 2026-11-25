export function CardSkeletons({
  label,
  grid = "catalog-grid",
}: {
  label: string;
  grid?: string;
}) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div className={grid} aria-hidden="true">
        {[0, 1, 2].map((card) => (
          <div className="content-skeleton-stack" key={card}>
            <div className="content-skeleton-block content-skeleton-media" />
            <div className="content-skeleton-block content-skeleton-line" />
            <div className="content-skeleton-block content-skeleton-short" />
          </div>
        ))}
      </div>
    </div>
  );
}
