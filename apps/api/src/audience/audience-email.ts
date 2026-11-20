import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AudienceCapabilities } from "@biling/contracts";
import { AppConfigService } from "../config/config.service";
import type { AudienceChallengeKind } from "../generated/prisma/client";

const loopback = ["localhost", "127.0.0.1", "[::1]"];

@Injectable()
export class AudienceEmail {
  private readonly logger = new Logger(AudienceEmail.name);
  private readonly origin = URL.parse(process.env.AUDIENCE_WEB_ORIGIN ?? "http://127.0.0.1:3000");
  private readonly apiKey = process.env.AUDIENCE_RESEND_API_KEY?.trim();
  private readonly from = process.env.AUDIENCE_EMAIL_FROM?.trim();

  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  capabilities(): AudienceCapabilities {
    const local =
      this.config.get("NODE_ENV") !== "production" &&
      !!this.origin &&
      loopback.includes(this.origin.hostname) &&
      loopback.includes(new URL(this.config.get("DATABASE_URL")).hostname);
    const validOrigin = !!this.origin && this.origin.href === this.origin.origin + "/";
    const supportedOrigin =
      validOrigin &&
      (this.origin.protocol === "https:" || (local && this.origin.protocol === "http:"));
    const emailAvailable = supportedOrigin && !!this.apiKey && !!this.from;
    return {
      emailAvailable,
      registration: emailAvailable ? "verify" : local && supportedOrigin ? "local" : "unavailable",
    };
  }

  async send(kind: AudienceChallengeKind, email: string, token: string) {
    if (!this.capabilities().emailAvailable || !this.origin) return;
    const reset = kind === "RESET_PASSWORD";
    const link = new URL(reset ? "/reset-password" : "/verify-email", this.origin);
    link.hash = token;
    const subject = reset ? "Reset your Biling Media password" : "Verify your Biling Media email";
    const expiry = reset ? "30 minutes" : "24 hours";

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + this.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.from,
          to: [email],
          subject,
          text:
            subject +
            "\n\n" +
            link.href +
            "\n\nThis link expires in " +
            expiry +
            ". If you did not request this, you can ignore this email.",
        }),
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok)
        this.logger.warn("Audience email provider rejected a message (" + response.status + ").");
    } catch {
      this.logger.warn("Audience email provider could not be reached.");
    }
  }
}
