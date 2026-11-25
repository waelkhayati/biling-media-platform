export default function LoadingStudio() {
  return (
    <div role="status">
      <span className="sr-only">Loading Studio</span>
      <div className="content-skeleton-stack" aria-hidden="true">
        <div className="content-skeleton-block content-skeleton-heading" />
        {[0, 1, 2, 3].map((row) => (
          <div className="content-skeleton-block content-skeleton-row" key={row} />
        ))}
      </div>
    </div>
  );
}
