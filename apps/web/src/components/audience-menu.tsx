import Link from "next/link";
import { getAudienceProfile } from "@/lib/audience-api";
import { AudienceLogout } from "./audience-form";

export async function AudienceMenu() {
  const profile = await getAudienceProfile().catch(() => null);
  if (!profile) {
    return (
      <details className="audience-menu">
        <summary>Sign in</summary>
        <div className="audience-menu-panel">
          <Link href="/login">Sign in</Link>
          <Link href="/register">Register</Link>
        </div>
      </details>
    );
  }
  return (
    <details className="audience-menu">
      <summary>Account</summary>
      <div className="audience-menu-panel">
        <strong className="audience-menu-name">{profile.displayName}</strong>
        <Link href="/profile">My profile</Link>
        <Link href="/profile/edit">Edit profile</Link>
        <AudienceLogout compact />
      </div>
    </details>
  );
}
