"use client";
import { useActionState } from "react";
import { moderateCommunityComment } from "@/app/admin/actions";

export function ModerationControls({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(moderateCommunityComment.bind(null, id), {});
  return (
    <form className="moderation-controls" action={action}>
      <label>
        Action
        <select name="action" defaultValue={status === "VISIBLE" ? "HIDE" : "RESTORE"}>
          <option value="HIDE">Hide comment</option>
          <option value="RESTORE">Restore comment</option>
          <option value="REMOVE">Remove permanently from view</option>
          <option value="DISMISS_REPORTS">Dismiss open reports</option>
        </select>
      </label>
      <label>
        Moderator note
        <textarea name="note" maxLength={500} rows={2} />
      </label>
      <button className="studio-button" disabled={pending}>
        {pending ? "Applying…" : "Apply action"}
      </button>
      {state.error && (
        <p className="studio-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
