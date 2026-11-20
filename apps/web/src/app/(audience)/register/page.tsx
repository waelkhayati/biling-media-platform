import Link from "next/link";
import { AudiencePanel } from "@/components/audience-panel";
import { AudienceForm } from "@/components/audience-form";
import {
  AudienceEmailField,
  AudiencePasswordField,
  AudienceProfileFields,
} from "@/components/audience-fields";
import { getAudienceCapabilities } from "@/lib/audience-api";
import { registerAudience } from "../actions";

export const metadata = { title: "Create an account" };

export default async function RegisterPage() {
  const { registration } = await getAudienceCapabilities();
  return (
    <AudiencePanel title="Join Biling.">
      {registration === "unavailable" ? (
        <p role="status">Registration is currently unavailable.</p>
      ) : (
        <AudienceForm action={registerAudience} submit="Create account">
          {registration === "verify" && (
            <p>Use an inbox you can access. You’ll need it to verify your account.</p>
          )}
          <AudienceProfileFields />
          <AudienceEmailField />
          <AudiencePasswordField create />
        </AudienceForm>
      )}
      <div className="audience-links">
        <Link href="/login">Already registered? Sign in</Link>
      </div>
    </AudiencePanel>
  );
}
