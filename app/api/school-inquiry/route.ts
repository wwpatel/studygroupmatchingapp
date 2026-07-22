import { getResendClient, SCHOOL_INQUIRY_RECIPIENT, INQUIRY_FROM_ADDRESS } from "@/lib/email/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  // Honeypot: a hidden field real visitors never fill in. Bots that
  // autofill every field will trip it; silently pretend success.
  if (body?.website) {
    return NextResponse.json({ ok: true });
  }

  const schoolName = String(body?.schoolName ?? "").trim();
  const contactName = String(body?.contactName ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const studentCount = String(body?.studentCount ?? "").trim();
  const message = String(body?.message ?? "").trim();

  if (!schoolName || !contactName || !email || !message) {
    return NextResponse.json(
      { error: "School name, your name, email, and a message are required." },
      { status: 400 },
    );
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: INQUIRY_FROM_ADDRESS,
      to: SCHOOL_INQUIRY_RECIPIENT,
      replyTo: email,
      subject: `School inquiry: ${schoolName}`,
      html: `
        <h2>New school inquiry</h2>
        <p><strong>School / district:</strong> ${escapeHtml(schoolName)}</p>
        <p><strong>Contact:</strong> ${escapeHtml(contactName)} (${escapeHtml(email)})</p>
        ${studentCount ? `<p><strong>Approx. students:</strong> ${escapeHtml(studentCount)}</p>` : ""}
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      `,
    });

    if (error) {
      console.error("[school-inquiry] Resend API error:", error);
      return NextResponse.json({ error: "Couldn't send your inquiry. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[school-inquiry] send failed:", err);
    const message =
      err instanceof Error && err.message.includes("RESEND_API_KEY")
        ? "Inquiries aren't set up yet — ask an admin to configure RESEND_API_KEY."
        : "Something went wrong sending your inquiry. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
