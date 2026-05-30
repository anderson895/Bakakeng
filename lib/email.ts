import nodemailer, { type Transporter } from 'nodemailer';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Brgy. Bakakeng DMS';

let transporter: Transporter | null = null;

// Gmail SMTP transporter — uses a Gmail App Password (not the normal login password).
// Returns null if credentials are missing so email stays a best-effort, non-fatal step.
function getTransporter(): Transporter | null {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

interface BaseMail {
  to: string;
  name: string;
  controlNumber: string;
  documentType: DocumentType;
}

function shell(title: string, accent: string, body: string): string {
  return `
  <div style="margin:0;padding:24px;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;color:#1e293b;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#0f2d5e;padding:22px 28px;">
        <p style="margin:0;color:#ffffff;font-size:16px;font-weight:600;">Barangay Bakakeng</p>
        <p style="margin:2px 0 0;color:#cbd5e1;font-size:12px;">Document Management System</p>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 16px;font-size:18px;color:${accent};">${title}</h1>
        ${body}
      </div>
      <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">
          This is an automated message from the Barangay Bakakeng DMS. Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 0;font-size:13px;color:#64748b;">${label}</td>
    <td style="padding:4px 0;font-size:13px;color:#1e293b;font-weight:600;text-align:right;">${value}</td>
  </tr>`;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn('[email] GMAIL_USER / GMAIL_APP_PASSWORD not set — skipping email to', to);
    return false;
  }
  try {
    await t.sendMail({ from: `"${FROM_NAME}" <${GMAIL_USER}>`, to, subject, html });
    return true;
  } catch (err) {
    console.error('[email] Failed to send to', to, err);
    return false;
  }
}

// Sent when a request is rejected — `reason` typically lists the missing requirements.
export async function sendRejectionEmail(
  mail: BaseMail & { reason: string }
): Promise<boolean> {
  const docLabel = DOCUMENT_TYPE_LABELS[mail.documentType];
  const body = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
      Hi <strong>${mail.name}</strong>, we regret to inform you that your document request
      could not be processed at this time and has been <strong>rejected</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
      ${detailRow('Control No.', mail.controlNumber)}
      ${detailRow('Document', docLabel)}
    </table>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin:0 0 16px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#b91c1c;text-transform:uppercase;letter-spacing:.04em;">
        Reason / Missing Requirements
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#7f1d1d;white-space:pre-line;">${mail.reason}</p>
    </div>
    <p style="margin:0;font-size:14px;line-height:1.6;">
      Please complete the requirements above and submit a new request, or visit the Barangay Hall for assistance.
    </p>`;
  return send(
    mail.to,
    `Document Request ${mail.controlNumber} — Rejected`,
    shell('Request Rejected', '#b91c1c', body)
  );
}

// Sent when a request's documents are approved and ready for release.
export async function sendReadyEmail(mail: BaseMail): Promise<boolean> {
  const docLabel = DOCUMENT_TYPE_LABELS[mail.documentType];
  const body = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
      Good news, <strong>${mail.name}</strong>! Your requested document has been
      <strong>approved</strong> and is now <strong>ready for release</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
      ${detailRow('Control No.', mail.controlNumber)}
      ${detailRow('Document', docLabel)}
    </table>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:14px 16px;margin:0 0 16px;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#065f46;">
        You may now claim your document at the <strong>Barangay Bakakeng Hall</strong> during office hours.
        Please bring a valid ID for verification.
      </p>
    </div>
    <p style="margin:0;font-size:14px;line-height:1.6;">Thank you for using the Barangay Bakakeng DMS.</p>`;
  return send(
    mail.to,
    `Document Request ${mail.controlNumber} — Ready for Release`,
    shell('Document Ready for Release', '#047857', body)
  );
}
