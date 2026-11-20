"use client";

import { useActionState } from "react";
import type { CommunityComment, CommunityTarget } from "@biling/contracts";
import {
  addComment,
  deleteComment,
  editComment,
  reportComment,
  toggleFollow,
  toggleLike,
  type CommunityState,
} from "@/app/community-actions";

const initial: CommunityState = {};
function Feedback({ state }: { state: CommunityState }) {
  return state.error || state.success ? (
    <p className="community-feedback" role={state.error ? "alert" : "status"}>
      {state.error ?? state.success}
    </p>
  ) : null;
}

export function LikeControl({
  path,
  target,
  liked,
  count,
  signedIn,
}: {
  path: string;
  target: CommunityTarget;
  liked: boolean;
  count: number;
  signedIn: boolean;
}) {
  const [state, action, pending] = useActionState(toggleLike.bind(null, path, !liked), initial);
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="target" value={JSON.stringify(target)} />
        <button
          className={liked ? "community-button active" : "community-button"}
          disabled={pending}
          aria-pressed={liked}
        >
          {liked ? "Liked" : "Like"} <span>{count}</span>
        </button>
      </form>
      {!signedIn && (
        <a className="community-signin" href="/login">
          Sign in to react
        </a>
      )}
      <Feedback state={state} />
    </div>
  );
}

export function FollowControl({
  path,
  slug,
  followed,
  count,
  signedIn,
}: {
  path: string;
  slug: string;
  followed: boolean;
  count: number;
  signedIn: boolean;
}) {
  const [state, action, pending] = useActionState(
    toggleFollow.bind(null, path, slug, !followed),
    initial,
  );
  return (
    <div>
      <form action={action}>
        <button
          className={followed ? "community-button active" : "community-button"}
          disabled={pending}
          aria-pressed={followed}
        >
          {followed ? "Following" : "Follow"} <span>{count}</span>
        </button>
      </form>
      {!signedIn && (
        <a className="community-signin" href="/login">
          Sign in to follow
        </a>
      )}
      <Feedback state={state} />
    </div>
  );
}

function CommentComposer({
  path,
  target,
  parentId,
  label,
}: {
  path: string;
  target: CommunityTarget;
  parentId?: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(addComment.bind(null, path), initial);
  return (
    <form className="community-composer" action={action}>
      <input type="hidden" name="target" value={JSON.stringify(target)} />
      <input type="hidden" name="parentId" value={parentId ?? ""} />
      <label>
        <span className="sr-only">{label}</span>
        <textarea
          name="body"
          required
          maxLength={2000}
          rows={parentId ? 2 : 4}
          placeholder={label}
        />
      </label>
      <button className="community-button" disabled={pending}>
        {pending ? "Posting…" : parentId ? "Reply" : "Post comment"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

function CommentItem({
  comment,
  path,
  target,
  signedIn,
}: {
  comment: CommunityComment;
  path: string;
  target: CommunityTarget;
  signedIn: boolean;
}) {
  const [editState, editAction, editing] = useActionState(
    editComment.bind(null, path, comment.id),
    initial,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteComment.bind(null, path, comment.id),
    initial,
  );
  const [reportState, reportAction, reporting] = useActionState(
    reportComment.bind(null, path, comment.id),
    initial,
  );
  return (
    <article className="community-comment">
      <header>
        <div className="community-avatar">
          {comment.author.avatarUrl ? (
            <img src={comment.author.avatarUrl} alt="" />
          ) : (
            comment.author.displayName.slice(0, 1).toUpperCase()
          )}
        </div>
        <div>
          <strong>{comment.author.displayName}</strong>
          <span>
            @{comment.author.username} ·{" "}
            <time dateTime={comment.createdAt}>
              {new Date(comment.createdAt).toLocaleDateString()}
            </time>
          </span>
        </div>
      </header>
      <p>{comment.body}</p>
      {comment.owned ? (
        <details>
          <summary>Edit or delete</summary>
          <form action={editAction}>
            <textarea name="body" defaultValue={comment.body} required maxLength={2000} />
            <button disabled={editing}>Save edit</button>
          </form>
          <form action={deleteAction}>
            <button disabled={deleting}>Delete comment</button>
          </form>
          <Feedback state={editState.error ? editState : deleteState} />
        </details>
      ) : signedIn ? (
        <details>
          <summary>Report</summary>
          <form action={reportAction}>
            <select name="reason" defaultValue="SPAM">
              <option value="SPAM">Spam</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="HATEFUL">Hateful content</option>
              <option value="SEXUAL">Sexual content</option>
              <option value="VIOLENCE">Violence</option>
              <option value="MISINFORMATION">Misinformation</option>
              <option value="OTHER">Other</option>
            </select>
            <textarea name="details" maxLength={500} placeholder="Optional details" />
            <button disabled={reporting}>Submit report</button>
          </form>
          <Feedback state={reportState} />
        </details>
      ) : null}
      {signedIn && !comment.owned && (
        <CommentComposer
          path={path}
          target={target}
          parentId={comment.id}
          label={`Reply to @${comment.author.username}`}
        />
      )}
      {comment.replies.length > 0 && (
        <div className="community-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              path={path}
              target={target}
              signedIn={signedIn}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export function Discussion({
  path,
  target,
  comments,
  signedIn,
  page,
  sort,
  hasMore,
}: {
  path: string;
  target: CommunityTarget;
  comments: CommunityComment[];
  signedIn: boolean;
  page: number;
  sort: "newest" | "oldest";
  hasMore: boolean;
}) {
  const href = (nextPage: number, nextSort = sort) =>
    `${path}?${new URLSearchParams({ commentsPage: String(nextPage), commentsSort: nextSort })}#discussion-title`;
  return (
    <section className="community-discussion" aria-labelledby="discussion-title">
      <div className="community-heading">
        <span>Community / On air</span>
        <h2 id="discussion-title">Join the discussion</h2>
      </div>
      <nav className="community-sort" aria-label="Comment order">
        <a aria-current={sort === "newest" ? "page" : undefined} href={href(1, "newest")}>
          Newest
        </a>
        <a aria-current={sort === "oldest" ? "page" : undefined} href={href(1, "oldest")}>
          Oldest
        </a>
      </nav>
      {signedIn ? (
        <CommentComposer path={path} target={target} label="Share your take…" />
      ) : (
        <p className="community-auth-prompt">
          <a href={`/login?returnTo=${encodeURIComponent(path)}`}>Sign in</a> to post a comment.
          Everyone can read the discussion.
        </p>
      )}
      {comments.length ? (
        <div className="community-comments">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              path={path}
              target={target}
              signedIn={signedIn}
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">No comments yet. Start the conversation.</p>
      )}
      {(page > 1 || hasMore) && (
        <nav className="community-pages" aria-label="Comment pages">
          {page > 1 && <a href={href(page - 1)}>Previous</a>}
          {hasMore && <a href={href(page + 1)}>Next</a>}
        </nav>
      )}
    </section>
  );
}
