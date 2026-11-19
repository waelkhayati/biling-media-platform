import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { StudioLoginForm } from "@/components/studio-auth-forms";
import { getStudioAccount } from "@/lib/studio-api";

export default async function AdminLogin() {
  if (await getStudioAccount()) redirect("/admin");

  return (
    <main className="studio-login page-gutter">
      <section className="studio-login-panel" aria-labelledby="studio-login-title">
        <BrandLogo />
        <h1 id="studio-login-title">Admin Studio</h1>
        <p>Sign in with your Biling staff account.</p>
        <StudioLoginForm />
        <Link className="studio-back" href="/admin/signup">
          Accept a staff invitation
        </Link>
        <Link className="studio-back" href="/admin/recovery">
          Recover access
        </Link>
      </section>
    </main>
  );
}
