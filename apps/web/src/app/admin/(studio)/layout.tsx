import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { StudioLogoutForm } from "@/components/studio-auth-forms";
import { requireStudioAccount } from "@/lib/studio-api";

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const account = await requireStudioAccount();

  return (
    <>
      <a className="skip-link" href="#studio-main">
        Skip to Studio content
      </a>
      <header className="studio-header page-gutter">
        <Link href="/admin" className="studio-brand">
          <BrandLogo />
          Admin Studio
        </Link>
        <nav aria-label="Studio navigation">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/shows">Productions</Link>
          <Link href="/admin/episodes">Episodes</Link>
          <Link href="/admin/articles">Articles</Link>
          <Link href="/admin/audit">Activity</Link>
          {account.role === "ADMIN" && <Link href="/admin/staff">Staff</Link>}
        </nav>
        <div className="studio-account">
          <span title={account.email}>{account.role === "ADMIN" ? "Administrator" : "Editor"}</span>
          <StudioLogoutForm />
        </div>
      </header>
      <main id="studio-main" className="studio-main page-gutter">
        {children}
      </main>
    </>
  );
}
