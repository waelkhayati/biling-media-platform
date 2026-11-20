"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { audienceTokenSchema } from "@biling/schemas";
import {
  logoutAudience,
  resendAudienceVerification,
  type AudienceFormState,
} from "@/app/(audience)/actions";

export function AudienceForm({
  action,
  submit,
  children,
}: {
  action: (state: AudienceFormState, data: FormData) => Promise<AudienceFormState>;
  submit: string;
  children: ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  return (
    <>
      <form className="audience-form" action={dispatch}>
        {children}
        <button type="submit" className="button audience-submit" disabled={pending}>
          {pending ? "Working…" : submit}
        </button>
        {state.error && !state.verificationEmail && (
          <p className="audience-feedback audience-error" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="audience-feedback" role="status">
            {state.success}
          </p>
        )}
      </form>
      {state.error && state.verificationEmail && !pending && (
        <div className="audience-feedback audience-error audience-verification-alert">
          <p role="alert">{state.error}</p>
          <AudienceForm
            key={state.verificationEmail}
            action={resendAudienceVerification}
            submit="Resend verification email"
          >
            <input type="hidden" name="email" value={state.verificationEmail} />
          </AudienceForm>
        </div>
      )}
    </>
  );
}

export function AudienceTokenField({ label }: { label: string }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const token = audienceTokenSchema.safeParse(window.location.hash.slice(1));
    if (token.success && input.current) {
      input.current.defaultValue = token.data;
      input.current.value = token.data;
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);
  return (
    <label>
      {label}
      <input ref={input} name="token" type="password" autoComplete="off" maxLength={43} required />
    </label>
  );
}

export function AudienceLogout({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState(logoutAudience, {});
  return (
    <form action={action} className={compact ? "audience-menu-form" : "audience-form"}>
      <button
        type="submit"
        className={compact ? "audience-menu-action" : "button audience-submit"}
        disabled={pending}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {state.error && (
        <p className="audience-feedback audience-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
