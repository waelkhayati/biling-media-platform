import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";

export function StandardPage({ code, title, children, retry }: { code: string; title: string; children: ReactNode; retry?: () => void }) {
  return <><SiteHeader /><main className="standard-page page-gutter"><span>{code}</span><h1>{title}</h1><div>{children}</div><nav>{retry && <button onClick={retry}>Try again</button>}<Link href="/">Home</Link><Link href="/shows">Productions</Link><Link href="/articles">Articles</Link><Link href="/games">Games</Link></nav></main></>;
}
