"use client";

export default function StudioError() {
  return (
    <section className="studio-main page-gutter">
      <h1>Admin Studio unavailable</h1>
      <p>Try again in a moment.</p>
      <button className="studio-button" type="button" onClick={() => window.location.reload()}>
        Try again
      </button>
    </section>
  );
}
