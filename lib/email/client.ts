import { Resend } from "resend";

// Where school inquiries land. Not an env var — this is a fixed business
// address, not a per-environment secret.
export const SCHOOL_INQUIRY_RECIPIENT = "patel.gaiaa@gmail.com";

// Resend's shared sandbox sender — works immediately with any Resend account,
// no custom domain verification required. Swap for a verified "you@yourdomain"
// address once a domain is verified in the Resend dashboard.
export const INQUIRY_FROM_ADDRESS = "Nova Inquiries <onboarding@resend.dev>";

let client: Resend | null = null;

// Lazy singleton, mirroring lib/gemini/client.ts's getGeminiClient — every
// caller gets the same clear "not configured" error instead of a confusing
// downstream failure.
export function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured. Set it in .env.local to enable sending school inquiries (sign up free at resend.com).",
    );
  }
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}
