"use client";

import { useActionState } from "react";
import { changeStudioAccess } from "@/app/admin/actions";

export function StudioStaffForm({
  id,
  email,
  active,
}: {
  id: string;
  email: string;
  active: boolean;
}) {
  const [state, action, pending] = useActionState(changeStudioAccess.bind(null, id), {});
  return (
    <form
      className="studio-actions"
      action={action}
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.value === "ENABLE") return;
        const prompt =
          submitter?.value === "DISABLE"
            ? `Suspend ${email} and end all their sessions?`
            : `End all sessions for ${email}?`;
        if (!window.confirm(prompt)) event.preventDefault();
      }}
    >
      <button
        className="studio-button studio-button-outline"
        name="action"
        value={active ? "DISABLE" : "ENABLE"}
        disabled={pending}
      >
        {active ? "Suspend" : "Restore"}
      </button>
      {active && (
        <button
          className="studio-button studio-button-outline"
          name="action"
          value="REVOKE"
          disabled={pending}
        >
          Revoke sessions
        </button>
      )}
      {state.error && (
        <p className="studio-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
