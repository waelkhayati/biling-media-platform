import Image from "next/image";
import Link from "next/link";
import { AudiencePanel } from "@/components/audience-panel";
import { AudienceLogout } from "@/components/audience-form";
import { requireAudienceProfile } from "@/lib/audience-api";
import { communityRequest } from "@/lib/audience-api";
import type { FollowedShow } from "@biling/contracts";

export const metadata = { title: "My profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const profile = await requireAudienceProfile();
  const followingResponse = await communityRequest("/following", {}, true).catch(() => null);
  const following: FollowedShow[] = followingResponse?.ok ? await followingResponse.json() : [];
  const { saved } = await searchParams;
  const joined = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(profile.createdAt),
  );
  return (
    <AudiencePanel title="My profile.">
      {saved === "1" && (
        <p className="audience-feedback" role="status">
          Profile updated.
        </p>
      )}
      <div className="audience-profile-heading">
        {profile.avatarUrl && (
          <Image
            src={profile.avatarUrl}
            width={78}
            height={78}
            alt=""
            unoptimized
            referrerPolicy="no-referrer"
          />
        )}
        <div>
          <h2>{profile.displayName}</h2>
          <span>@{profile.username}</span>
        </div>
      </div>
      {profile.biography && (
        <p className="audience-biography" dir="auto">
          {profile.biography}
        </p>
      )}
      <dl className="audience-profile-details">
        <div>
          <dt>Email</dt>
          <dd>
            {profile.email} <small>{profile.emailVerified ? "Verified" : "Unverified"}</small>
          </dd>
        </div>
        <div>
          <dt>Member since</dt>
          <dd>
            <time dateTime={profile.createdAt}>{joined}</time>
          </dd>
        </div>
      </dl>
      <div className="audience-links">
        <Link href="/profile/edit">Edit profile</Link>
        {!profile.emailVerified && <Link href="/verify-email">Verify email</Link>}
      </div>
      <AudienceLogout />
      <section className="followed-shows" aria-labelledby="following-title">
        <h2 id="following-title">Following</h2>
        {following.length ? (
          following.map((show) => (
            <article className="followed-show" key={show.id}>
              <Link href={`/shows/${show.slug}`}>{show.title}</Link>
              {show.description && <p>{show.description}</p>}
            </article>
          ))
        ) : (
          <p>
            You are not following any productions yet. <Link href="/shows">Explore shows</Link>.
          </p>
        )}
      </section>
    </AudiencePanel>
  );
}
