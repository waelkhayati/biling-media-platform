"use client";

import Link from "next/link";
import { AudiencePanel } from "@/components/audience-panel";

export default function AudienceError({ reset }: { reset: () => void }) {
  return (
    <AudiencePanel title="Account unavailable.">
      <p>We couldn’t load this page. Try again in a moment.</p>
      <button type="button" className="button audience-submit" onClick={reset}>
        Try again
      </button>
      <div className="audience-links">
        <Link href="/">Back to Biling</Link>
      </div>
    </AudiencePanel>
  );
}
