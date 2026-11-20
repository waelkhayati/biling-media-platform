import Link from "next/link";
import { AudiencePanel } from "@/components/audience-panel";
import { AudienceForm } from "@/components/audience-form";
import { AudienceEmailField } from "@/components/audience-fields";
import { getAudienceCapabilities } from "@/lib/audience-api";
import { forgotAudiencePassword } from "../actions";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const { emailAvailable } = await getAudienceCapabilities();
  return (
    <AudiencePanel title="Forgot password?">
      {emailAvailable ? (
        <AudienceForm action={forgotAudiencePassword} submit="Request reset link">
          <AudienceEmailField />
        </AudienceForm>
      ) : (
        <p role="status">
          Password recovery is currently unavailable. This site has no configured account email
          service.
        </p>
      )}
      <div className="audience-links">
        <Link href="/login">Back to sign in</Link>
      </div>
    </AudiencePanel>
  );
}
