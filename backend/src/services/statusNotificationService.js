import User from "../models/User.js";
import { sendMail } from "../utils/mailer.js";
import { fetchDocumentAttachment } from "./documentEmailService.js";
import { ensurePdfAttachment } from "../utils/pdfConverter.js";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const DRAFT_VISIBLE = ["DraftSent", "DraftAccepted", "DraftRejected", "Completed"];

// Role -> the stage label shown in the email.
export function describeActor(user) {
  const role = String(user?.role || "").trim().toLowerCase();
  let label = "Vithartha team";
  if (role === "admin") label = "Admin";
  else if (/^pr\d*$/.test(role)) label = "PR";
  else if (/^executor\d*$/.test(role)) label = "Executor";
  return { label, name: user?.name || "" };
}

// Which of the lead's documents the client is entitled to receive right now.
// Draft/Final documents are only shared once they've actually been sent to
// the user; internal ExecutionResult files are never shared.
function selectDocuments(lead) {
  const docs = Array.isArray(lead.documents) ? lead.documents : [];
  return docs.filter((doc) => {
    if (!(doc?.url || doc?.publicId)) return false;
    const type = String(doc?.type || "Client").trim();
    if (type === "ExecutionResult") return false;
    if (type === "Draft") return DRAFT_VISIBLE.includes(lead.status);
    if (type === "Final") return lead.status === "Completed";
    return true;
  });
}

async function resolveRecipient(lead) {
  // The account email the user signed in with takes priority over the
  // email typed on the lead form.
  if (lead.user) {
    const account = await User.findById(lead.user?._id || lead.user).select("email name");
    if (account?.email) return { email: account.email, name: account.name || lead.name };
  }
  return { email: lead.email, name: lead.name };
}

async function buildPdfAttachments(docs) {
  const attachments = [];
  const skipped = [];
  const usedNames = new Map();

  for (const doc of docs) {
    const raw = await fetchDocumentAttachment(doc);
    if (!raw) {
      skipped.push(doc.name);
      continue;
    }
    const pdf = await ensurePdfAttachment(raw);
    const count = usedNames.get(pdf.filename) || 0;
    usedNames.set(pdf.filename, count + 1);
    const filename = count === 0 ? pdf.filename : pdf.filename.replace(/(\.[a-z0-9]+)$/i, ` (${count + 1})$1`);
    attachments.push({ filename, content: pdf.content, converted: pdf.converted });
  }
  return { attachments, skipped };
}

const CELL = "padding:6px 10px;border:1px solid #e5e7eb";

function buildHtml({ recipientName, lead, outcome, headline, detail, actor, docs, skipped, nonPdf, requestedDocuments }) {
  const color = outcome === "rejected" ? "#b91c1c" : outcome === "approved" ? "#15803d" : "#1d4ed8";
  const badge = outcome === "rejected" ? "REJECTED" : outcome === "approved" ? "APPROVED" : "UPDATE";

  const rows = docs
    .map((doc) => {
      const reason = doc.rejectionMessage
        ? `<br/><small style="color:#b91c1c">Reason: ${escapeHtml(doc.rejectionMessage)}</small>`
        : "";
      return `<tr><td style="${CELL}">${escapeHtml(doc.name)}${reason}</td><td style="${CELL}">${escapeHtml(doc.type || "Client")}</td><td style="${CELL}">${escapeHtml(doc.status || "Pending")}</td></tr>`;
    })
    .join("");

  return `
  <div style="font-family:Arial,sans-serif;max-width:620px;color:#111827">
    <p>Hi ${escapeHtml(recipientName || "there")},</p>
    <p><span style="background:${color};color:#fff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:bold">${badge}</span></p>
    <p style="font-size:16px"><strong>${escapeHtml(headline)}</strong></p>
    <table style="border-collapse:collapse;margin:8px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Service</td><td><strong>${escapeHtml(lead.serviceName)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Current status</td><td>${escapeHtml(lead.status)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Reviewed by</td><td>${escapeHtml(actor.label)}${actor.name ? ` (${escapeHtml(actor.name)})` : ""}</td></tr>
    </table>
    ${detail ? `<p style="background:#f9fafb;border-left:4px solid ${color};padding:10px 14px"><strong>Message:</strong> ${escapeHtml(detail)}</p>` : ""}
    ${requestedDocuments.length ? `<p><strong>Please upload the following documents</strong></p><ul>${requestedDocuments.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul><p style="font-size:13px;color:#6b7280">Log in to your Vithartha dashboard, open this service and upload each document.</p>` : ""}
    ${rows ? `<p><strong>Documents for this service</strong></p>
    <table style="border-collapse:collapse;font-size:14px"><tr style="background:#f3f4f6"><th align="left" style="${CELL}">Document</th><th align="left" style="${CELL}">Type</th><th align="left" style="${CELL}">Status</th></tr>${rows}</table>
    <p style="font-size:13px;color:#6b7280">The documents are attached to this email as PDF files.</p>` : ""}
    ${nonPdf.length ? `<p style="font-size:13px;color:#6b7280">Attached in original format (cannot be converted to PDF): ${nonPdf.map(escapeHtml).join(", ")}.</p>` : ""}
    ${skipped.length ? `<p style="font-size:13px;color:#b45309">Could not attach: ${skipped.map(escapeHtml).join(", ")}. Please view them from your dashboard.</p>` : ""}
    <p>Thank you for choosing Vithartha Consulting.</p>
  </div>`;
}

// Emails the lead's owner about an approval/rejection/status change, with the
// service's documents attached as PDFs. Never throws: a mail failure must not
// fail the review action that triggered it.
//   outcome: "approved" | "rejected" | "update"
//   requestedDocuments: names the user is being asked to upload (no attachments are sent then)
export async function notifyUserOfStatusChange(lead, { actor, outcome = "update", headline, detail = "", requestedDocuments = [] }) {
  try {
    if (!lead) return;
    const recipient = await resolveRecipient(lead);
    if (!recipient.email) {
      console.error(`[StatusEmail] No recipient email for lead ${lead._id}`);
      return;
    }

    const docs = requestedDocuments.length ? [] : selectDocuments(lead);
    const { attachments, skipped } = await buildPdfAttachments(docs);

    const html = buildHtml({
      recipientName: recipient.name,
      lead,
      outcome,
      headline,
      detail,
      actor: describeActor(actor),
      docs,
      skipped,
      requestedDocuments,
      nonPdf: attachments.filter((a) => !a.converted).map((a) => a.filename),
    });

    const prefix = requestedDocuments.length ? "Action required" : outcome === "rejected" ? "Rejected" : outcome === "approved" ? "Approved" : "Update";
    await sendMail({
      to: recipient.email,
      subject: `${prefix}: ${lead.serviceName} - Vithartha Consulting`,
      html,
      attachments: attachments.map(({ filename, content }) => ({ filename, content })),
    });
    console.log(`[StatusEmail] Sent "${headline}" to ${recipient.email} for lead ${lead._id} (${attachments.length} attachment(s))`);
  } catch (err) {
    console.error(`[StatusEmail] Failed for lead ${lead?._id}: ${err.message}`);
  }
}

// Maps a lead status transition to the email content. Returns null when the
// transition should not notify the client.
export function describeStatusTransition(lead, actor) {
  const { label } = describeActor(actor);
  const executor = lead.assignedExecutor ? ` (${lead.assignedExecutor})` : "";
  const rejectionDetail =
    (label === "Admin" ? lead.adminMessage : label === "PR" ? lead.prFeedback || lead.prMessage : lead.executorMessage) ||
    lead.prFeedback ||
    lead.adminMessage ||
    "";

  switch (lead.status) {
    case "PendingReview":
      return {
        outcome: "approved",
        headline:
          label === "Admin"
            ? "Your documents were approved by Admin and forwarded to PR for review."
            : "Your service is now under review.",
      };
    case "PR_Accepted":
      return { outcome: "approved", headline: "Your documents were approved by PR." };
    case "AssignedToExecutor":
      return {
        outcome: "approved",
        headline: `Your documents were approved by PR and your service was assigned to an executor${executor}.`,
      };
    case "InProgress":
      return {
        outcome: "approved",
        headline: "The executor accepted your documents and has started working on your service.",
      };
    case "ExecutionFinished":
      return { outcome: "update", headline: "Execution of your service is finished. A draft will follow." };
    case "DraftSent":
      return { outcome: "update", headline: "A draft for your service is ready for your review." };
    case "Completed":
      return { outcome: "approved", headline: "Your service is completed. Final documents are attached." };
    case "Rejected":
      return { outcome: "rejected", headline: `Your service was rejected by ${label}.`, detail: rejectionDetail };
    case "InformationRequired":
      return {
        outcome: "rejected",
        headline: `${label} needs more information or corrected documents for your service.`,
        detail: rejectionDetail,
      };
    case "Closed":
      return { outcome: "update", headline: "Your service has been closed." };
    default:
      return null;
  }
}
