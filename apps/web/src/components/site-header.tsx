import { Suspense } from "react";
import { AudienceMenu } from "./audience-menu";
import { SiteHeaderFrame } from "./site-header-frame";

export function SiteHeader({ onDiscovery = true }: { onDiscovery?: boolean }) {
  return (
    <SiteHeaderFrame
      onDiscovery={onDiscovery}
      account={
        <Suspense fallback={null}>
          <AudienceMenu />
        </Suspense>
      }
    />
  );
}
