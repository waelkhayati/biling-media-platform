import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { toDataURL } from "qrcode";
import { StudioMfaForm } from "@/components/studio-auth-forms";
import { studioChallengeRequest } from "@/lib/studio-api";

export default async function StudioMfaPage() {
  const response = await studioChallengeRequest("/auth/challenge");
  if (response.status === 401) redirect("/admin/login");
  if (!response.ok) throw new Error("Could not load the sign-in challenge.");
  const {
    kind,
    email,
    manualKey,
  }: { kind: "ENROLL" | "MFA"; email: string; manualKey: string | null } = await response.json();
  const qr = manualKey
    ? await toDataURL(
        `otpauth://totp/Biling%20Media:${encodeURIComponent(email)}?${new URLSearchParams({ secret: manualKey, issuer: "Biling Media", algorithm: "SHA1", digits: "6", period: "30" })}`,
        { width: 240, margin: 3 },
      )
    : null;

  return (
    <main className="studio-login page-gutter">
      <section className="studio-login-panel" aria-labelledby="mfa-title">
        <h1 id="mfa-title">{kind === "ENROLL" ? "Set up your authenticator" : "Verify sign-in"}</h1>
        {manualKey ? (
          <>
            <p>
              In Google Authenticator, tap <strong>+ → Scan a QR code</strong> and scan this screen.
              Then enter the six-digit code for Biling Media ({email}).
            </p>
            {qr && (
              <Image
                src={qr}
                width={240}
                height={240}
                alt="Scan this QR code with your authenticator app"
                unoptimized
                className="studio-setup-qr"
              />
            )}
            <details>
              <summary>Enter the key manually</summary>
              <label>
                Manual setup key
                <input
                  className="studio-key"
                  readOnly
                  value={manualKey}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </details>
          </>
        ) : (
          <p>Enter the code from your Biling Media authenticator.</p>
        )}
        <StudioMfaForm />
        <Link className="studio-back" href="/admin/login">
          Back to sign-in
        </Link>
      </section>
    </main>
  );
}
