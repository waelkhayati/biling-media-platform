import type { ReactNode } from "react";

export function AudiencePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="audience-panel">
      <header className="audience-panel-heading">
        <h1>{title}</h1>
      </header>
      <div className="audience-panel-body">{children}</div>
    </div>
  );
}
