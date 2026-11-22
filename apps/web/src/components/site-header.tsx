import { Suspense } from "react";
import { AudienceMenu } from "./audience-menu";
import { SiteHeaderFrame } from "./site-header-frame";

export function SiteHeader() {
  return (
    <SiteHeaderFrame
      account={
        <Suspense fallback={null}>
          <AudienceMenu />
        </Suspense>
      }
    />
  );
}
