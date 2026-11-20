import type { CommunityCommentList, CommunityEngagement, CommunityTarget } from "@biling/contracts";
import { getAudienceProfile, communityRequest } from "@/lib/audience-api";
import { Discussion, FollowControl, LikeControl } from "./community-controls";

function query(target: CommunityTarget) {
  const values = new URLSearchParams();
  Object.entries(target).forEach(([key, value]) => values.set(key, value));
  return values.toString();
}
export async function CommunityPanel({
  target,
  path,
  page = 1,
  sort = "newest",
}: {
  target: CommunityTarget;
  path: string;
  page?: number;
  sort?: "newest" | "oldest";
}) {
  const profile = await getAudienceProfile().catch(() => null);
  const auth = !!profile;
  const [commentsResponse, engagementResponse] = await Promise.all([
    communityRequest(
      `/comments?${query(target)}&sort=${sort}&page=${page}&limit=20`,
      {},
      auth,
    ).catch(() => null),
    communityRequest(`/engagement?${query(target)}`, {}, auth).catch(() => null),
  ]);
  if (!commentsResponse?.ok || !engagementResponse?.ok)
    return (
      <section className="community-unavailable page-gutter">
        <h2>Community</h2>
        <p>Community features are temporarily unavailable.</p>
      </section>
    );
  const comments = (await commentsResponse.json()) as CommunityCommentList;
  const engagement = (await engagementResponse.json()) as CommunityEngagement;
  return (
    <section className="community-shell page-gutter">
      <div className="community-actions">
        {target.type === "show" ? (
          <FollowControl
            path={path}
            slug={target.slug}
            followed={engagement.followed}
            count={engagement.followerCount}
            signedIn={auth}
          />
        ) : (
          <LikeControl
            path={path}
            target={target}
            liked={engagement.liked}
            count={engagement.likeCount}
            signedIn={auth}
          />
        )}
      </div>
      <Discussion
        path={path}
        target={target}
        comments={comments.items}
        signedIn={auth}
        page={comments.page}
        sort={sort}
        hasMore={comments.hasMore}
      />
    </section>
  );
}
