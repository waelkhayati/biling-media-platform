"use client";

import { useActionState } from "react";
import {
  recoverStudioAccount,
  signIn,
  signOut,
  signUpStudioAccount,
  verifyStudioMfa,
} from "@/app/admin/actions";

export function StudioLoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="studio-form">
      <label>
        Email
        <input name="email" type="email" autoComplete="username" maxLength={254} required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={128}
          required
        />
      </label>
      <details>
        <summary>Setting up your authenticator?</summary>
        <label>
          One-time setup code
          <input name="setupCode" type="password" autoComplete="off" maxLength={43} />
        </label>
      </details>
      {state.error && (
        <p className="studio-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="studio-button" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function StudioMfaForm() {
  const [state, action, pending] = useActionState(verifyStudioMfa, {});
  return (
    <form action={action} className="studio-form">
      <label>
        Authenticator code
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
      </label>
      {state.error && (
        <p className="studio-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="studio-button" disabled={pending}>
        {pending ? "Verifying…" : "Verify and sign in"}
      </button>
    </form>
  );
}

export function StudioEnrollmentForm({ invite = false }: { invite?: boolean }) {
  const [state, action, pending] = useActionState(
    invite ? signUpStudioAccount : recoverStudioAccount,
    {},
  );
  return (
    <form action={action} className="studio-form">
      <label>
        {invite ? "Invitation code" : "Recovery code"}
        <input
          name="code"
          type="password"
          autoComplete="off"
          minLength={43}
          maxLength={43}
          required
        />
      </label>
      <label>
        New password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      <label>
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      {state.error && (
        <p className="studio-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="studio-button" disabled={pending}>
        {pending ? "Continuing…" : invite ? "Continue to authenticator setup" : "Recover account"}
      </button>
    </form>
  );
}

export function StudioLogoutForm() {
  const [state, action, pending] = useActionState(signOut, {});
  return (
    <form action={action} className="studio-logout">
      <button className="studio-button studio-button-outline" disabled={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {state.error && (
        <p className="studio-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
