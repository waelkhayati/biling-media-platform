"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function LinkStatus() {
  const { pending } = useLinkStatus();

  return (
    <span className={pending ? "content-link-status" : "sr-only"} role="status">
      {pending ? "Loading…" : ""}
    </span>
  );
}

export function ContentLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link prefetch={false} {...props}>
      {children}
      <LinkStatus />
    </Link>
  );
}
