import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const RECIPIENT = "arnavgupta09au@gmail.com";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      stack?: string;
      url?: string;
      context?: string;
    };

    const subject = `[Mastify Error] ${(body.message ?? "Unknown error").slice(0, 80)}`;

    await resend.emails.send({
      from: "Mastify Errors <noreply@mastify.app>",
      to: [RECIPIENT],
      subject,
      html: `
<h2 style="font-family:monospace;color:#cc0000">Mastify Runtime Error</h2>
<table style="font-family:monospace;font-size:13px;border-collapse:collapse">
  <tr><td style="padding:4px 12px 4px 0;color:#666">Time</td><td>${new Date().toISOString()}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">URL</td><td>${body.url ?? "unknown"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Context</td><td>${body.context ?? "unknown"}</td></tr>
</table>
<h3 style="font-family:monospace">Message</h3>
<pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap">${body.message ?? "no message"}</pre>
<h3 style="font-family:monospace">Stack Trace</h3>
<pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap;font-size:12px">${body.stack ?? "no stack trace"}</pre>
      `.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to send error report:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
