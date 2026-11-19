import Link from "next/link";
import { StudioEnrollmentForm } from "@/components/studio-auth-forms";

export default function StudioSignupPage() {
  return (
    <main className="studio-login page-gutter">
      <section className="studio-login-panel" aria-labelledby="signup-title">
        <h1 id="signup-title">Create your staff account</h1>
        <p>
          Enter the invitation code from your Studio operator and choose a password. Next, set up
          your authenticator.
        </p>
        <StudioEnrollmentForm invite />
        <Link className="studio-back" href="/admin/login">
          Back to sign-in
        </Link>
      </section>
    </main>
  );
}
