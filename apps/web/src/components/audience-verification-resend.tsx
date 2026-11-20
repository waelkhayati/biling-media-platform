import { resendAudienceVerification } from "@/app/(audience)/actions";
import { AudienceEmailField } from "./audience-fields";
import { AudienceForm } from "./audience-form";

export function AudienceVerificationResend() {
  return (
    <details className="audience-resend">
      <summary>Resend verification email</summary>
      <AudienceForm action={resendAudienceVerification} submit="Send new link">
        <AudienceEmailField />
      </AudienceForm>
    </details>
  );
}
