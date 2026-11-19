import Link from "next/link";
import { StudioEnrollmentForm } from "@/components/studio-auth-forms";

export default function StudioRecoveryPage() {
  return (
    <main className="studio-login page-gutter">
      <section className="studio-login-panel" aria-labelledby="recovery-title">
        <h1 id="recovery-title">Recover access</h1>
        <p>
          Ask your Studio operator for a one-time recovery code. Recovery ends existing sessions and
          lets you set up a new authenticator.
        </p>
        <StudioEnrollmentForm />
        <Link className="studio-back" href="/admin/login">
          Back to sign-in
        </Link>
      </section>
    </main>
  );
}
