"use client";
import Link from "next/link";
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="standard-page page-gutter"><span>Signal interrupted</span><h1>We could not load that right now.</h1><p>The Biling signal hit a temporary problem. Try again, or return to discovery.</p><nav><button onClick={reset}>Try again</button><Link href="/">Home</Link><Link href="/shows">Productions</Link><Link href="/articles">Articles</Link><Link href="/games">Games</Link></nav></main>; }
