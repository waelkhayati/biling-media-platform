import Link from "next/link";
import { AudiencePanel } from "@/components/audience-panel";
import { AudienceForm } from "@/components/audience-form";
import { AudienceProfileFields } from "@/components/audience-fields";
import { requireAudienceProfile } from "@/lib/audience-api";
import { updateAudienceProfile } from "../../actions";

export const metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const profile = await requireAudienceProfile();
  return (
    <AudiencePanel title="Edit profile.">
      <AudienceForm action={updateAudienceProfile} submit="Save profile">
        <AudienceProfileFields profile={profile} />
      </AudienceForm>
      <div className="audience-links">
        <Link href="/profile">Back to profile</Link>
      </div>
    </AudiencePanel>
  );
}
