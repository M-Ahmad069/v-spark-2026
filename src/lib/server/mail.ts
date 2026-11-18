import "server-only";
import nodemailer from "nodemailer";
import type { PostRow, SettingsRow } from "./db";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const strip = (s: string) => s.replace(/[\r\n]+/g, " ");

export async function sendPostEmail(post: PostRow, settings: SettingsRow, kind: "reminder" | "test" = "reminder") {
  const when = new Date(post.scheduled_at).toLocaleString("en-GB", {
    timeZone: settings.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });
  const tags = settings.include_hashtags && post.hashtags.length ? post.hashtags.join(" ") : "";
  const subject = strip(
    `${settings.subject_prefix}: ${kind === "test" ? "Test notification" : `Time to post on ${post.platform}`}`,
  );

  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#18181b">
    <p style="font-size:13px;color:#71717a;margin:0 0 8px">${escape(post.platform.toUpperCase())} · ${escape(when)}</p>
    <h2 style="margin:0 0 16px;font-size:20px">${kind === "test" ? "Your notifications are working" : "Your scheduled post is due"}</h2>
    <div style="white-space:pre-wrap;border:1px solid #e4e4e7;border-radius:12px;padding:16px;font-size:15px;line-height:1.5">${escape(post.caption)}${
      tags ? `<p style="color:#4f46e5;margin:12px 0 0">${escape(tags)}</p>` : ""
    }</div>
    ${post.notes ? `<p style="font-size:14px;margin:16px 0 0"><b>Notes:</b> ${escape(post.notes)}</p>` : ""}
    <p style="font-size:12px;color:#a1a1aa;margin-top:24px">Sent by CaptionFlow. Change these emails in Settings.</p>
  </div>`;

  await transporter.sendMail({
    from: `CaptionFlow <${process.env.GMAIL_USER}>`,
    to: settings.email,
    subject,
    text: `${post.caption}\n\n${tags}\n\nScheduled: ${when}${post.notes ? `\nNotes: ${post.notes}` : ""}`,
    html,
  });
}
