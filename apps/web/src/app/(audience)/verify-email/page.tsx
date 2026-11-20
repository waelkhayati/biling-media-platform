import Link from "next/link";
import { AudiencePanel } from "@/components/audience-panel";
import { AudienceForm, AudienceTokenField } from "@/components/audience-form";
import { AudiencePasswordField } from "@/components/audience-fields";
import { AudienceVerificationResend } from "@/components/audience-verification-resend";
import { getAudienceCapabilities } from "@/lib/audience-api";
import { verifyAudienceEmail } from "../actions";

export const metadata = { title: "Verify email" };

export default async function VerifyEmailPage() {
  const { emailAvailable } = await getAudienceCapabilities();
  return (
    <AudiencePanel title="Verify your email.">
      <AudienceForm action={verifyAudienceEmail} submit="Verify email">
        <AudienceTokenField label="Verification code from your email link" />
        <AudiencePasswordField />
      </AudienceForm>
      {emailAvailable && <AudienceVerificationResend />}
      <div className="audience-links">
        <Link href="/login">Back to sign in</Link>
      </div>
    </AudiencePanel>
  );
}
