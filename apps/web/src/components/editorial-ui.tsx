import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label">{children}</p>;
}

export function MediaPlaceholder({
  title,
  label = "Official Biling media asset needed",
  className = "",
}: {
  title: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`media-placeholder ${className}`.trim()}
      role="img"
      aria-label={`${title}. Placeholder only; ${label.toLowerCase()}.`}
    >
      <div className="media-placeholder-content">
        <p className="media-placeholder-title">{title}</p>
        <span className="media-placeholder-label">{label}</span>
      </div>
    </div>
  );
}
