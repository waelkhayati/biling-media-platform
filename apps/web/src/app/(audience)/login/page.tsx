import Link from "next/link";
import { AudiencePanel } from "@/components/audience-panel";
import { AudienceForm } from "@/components/audience-form";
import { AudienceEmailField, AudiencePasswordField } from "@/components/audience-fields";
import { getAudienceCapabilities } from "@/lib/audience-api";
import { loginAudience } from "../actions";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    registered?: string;
    verified?: string;
    reset?: string;
    signedOut?: string;
  }>;
}) {
  const [{ registered, verified, reset, signedOut }, { emailAvailable, registration }] =
    await Promise.all([searchParams, getAudienceCapabilities()]);
  const notice =
    verified === "1"
      ? "Email verified. You can sign in now."
      : reset === "1"
        ? "Password updated. Sign in with your new password."
        : signedOut === "1"
          ? "You are signed out."
          : registered === "1"
            ? emailAvailable
              ? "Registration submitted. Check your inbox for a verification link before signing in."
              : registration === "local"
                ? "Registration submitted. You can sign in now."
                : "Registration submitted."
            : null;
  return (
    <AudiencePanel title="Sign in.">
      {notice && (
        <p className="audience-feedback" role="status">
          {notice}
        </p>
      )}
      <AudienceForm action={loginAudience} submit="Sign in">
        <AudienceEmailField />
        <AudiencePasswordField />
      </AudienceForm>
      <nav className="audience-links" aria-label="Sign-in help">
        <Link href="/register">Create an account</Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </nav>
    </AudiencePanel>
  );
}
