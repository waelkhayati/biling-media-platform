import Link from "next/link";
import { AudiencePanel } from "@/components/audience-panel";
import { AudienceForm, AudienceTokenField } from "@/components/audience-form";
import { AudiencePasswordField } from "@/components/audience-fields";
import { resetAudiencePassword } from "../actions";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <AudiencePanel title="Reset password.">
      <AudienceForm action={resetAudiencePassword} submit="Update password">
        <AudienceTokenField label="Reset code from your email link" />
        <AudiencePasswordField create />
        <AudiencePasswordField confirm />
      </AudienceForm>
      <div className="audience-links">
        <Link href="/forgot-password">Request another reset link</Link>
      </div>
    </AudiencePanel>
  );
}
