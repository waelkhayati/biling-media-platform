"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inviteStudioStaff } from "@/app/admin/actions";

export function StudioStaffInviteForm() {
  const [state, action, pending] = useActionState(inviteStudioStaff, {});
  const invitation = pending ? undefined : state.invitation;

  return (
    <section aria-labelledby="staff-invite-heading">
      <h2 id="staff-invite-heading">Invite staff</h2>
      <form className="studio-filters" action={action}>
        <label>
          Staff email
          <input name="email" type="email" autoComplete="off" maxLength={254} required />
        </label>
        <label>
          Role
          <select name="role" defaultValue="EDITOR">
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </label>
        <button className="studio-button" disabled={pending}>
          {pending ? "Creating invitation…" : "Create invitation"}
        </button>
      </form>
      {!pending && state.error && (
        <p className="studio-error" role="alert">
          {state.error}
        </p>
      )}
      {invitation && (
        <div className="studio-notice">
          <p role="status">
            Invitation created for <strong>{invitation.email}</strong>.
          </p>
          <label>
            One-time invitation code
            <input
              value={invitation.code}
              readOnly
              spellCheck={false}
              onFocus={(event) => event.target.select()}
            />
          </label>
          <p>
            Share this code privately with the invitee and send them to{" "}
            <Link href="/admin/signup">staff sign-up</Link>. The code expires after 15 minutes.
          </p>
        </div>
      )}
    </section>
  );
}
