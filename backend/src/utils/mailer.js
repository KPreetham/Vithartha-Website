import { Resend } from "resend";

let resendClient = null;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// attachments: [{ filename, content: Buffer }]
export async function sendMail({ to, subject, html, attachments = [] }) {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) {
    throw new Error(error.message || "Failed to send email via Resend");
  }

  return data;
}
