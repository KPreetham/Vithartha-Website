import axios from "axios";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import { cloudinary } from "../config/cloudinary.js";
import { sendMail } from "../utils/mailer.js";
import { getDigestIntervalMs } from "../utils/emailDigestConfig.js";
import {
  uniqueValues,
  parseCloudinaryAssetUrl,
  buildCloudinarySignedUrl,
  tryCloudinaryResourceLookup,
} from "../utils/cloudinaryDocuments.js";

// Users that predate this feature (or were created while the sweep was
// disabled) have no schedule yet — start their clock now rather than
// leaving them permanently unscheduled.
async function scheduleUnscheduledUsers() {
  await User.updateMany(
    { role: "user", nextDocumentDigestAt: null },
    { $set: { nextDocumentDigestAt: new Date(Date.now() + getDigestIntervalMs()) } },
  );
}

async function findUsersDueForDigest() {
  const now = new Date();
  return User.find({
    role: "user",
    nextDocumentDigestAt: { $ne: null, $lte: now },
  });
}

const MIME_TO_EXTENSION = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

const HAS_EXTENSION = /\.[a-z0-9]{2,5}$/i;

// Draft/Final documents are named with their extension already (e.g.
// "DRAFT - ....pdf"), but documents the user uploaded themselves (e.g.
// "PAN", "Visa") are often just a label with no extension — without one,
// email clients can't tell the attachment is a PDF/image and may not open
// it correctly. Fall back to the downloaded file's actual Content-Type.
function resolveAttachmentFilename(doc, response, formatHint) {
  const rawName = String(doc?.name || "").trim() || "document";
  if (HAS_EXTENSION.test(rawName)) return rawName;

  if (formatHint) return `${rawName}.${formatHint}`;

  const contentType = String(response?.headers?.["content-type"] || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const extension = MIME_TO_EXTENSION[contentType];
  return extension ? `${rawName}.${extension}` : rawName;
}

// Cloudinary doesn't record which resource_type ("image"/"raw"/"video") an
// asset was actually stored under when it was uploaded with resource_type:
// "auto" — so, like leadController's streamDocument, this has to try
// several resource_type/delivery_type/format combinations rather than
// assume one, falling back to a Cloudinary API lookup if all fail.
export async function fetchDocumentAttachment(doc) {
  const parsedDocumentUrl = parseCloudinaryAssetUrl(doc?.url);
  const publicIds = uniqueValues([doc?.publicId, parsedDocumentUrl?.publicId]);
  if (publicIds.length === 0) return null;

  const fileExtension = String(doc?.name || "").split(".").pop()?.toLowerCase() || "";
  const resourceTypes = uniqueValues([
    parsedDocumentUrl?.resourceType,
    "image",
    "raw",
    "auto",
    "video",
  ]);
  const deliveryTypes = uniqueValues([parsedDocumentUrl?.deliveryType, "authenticated", "upload"]);
  const formats = uniqueValues([parsedDocumentUrl?.format, fileExtension]);

  const candidateUrls = new Set();
  for (const publicId of publicIds) {
    for (const resourceType of resourceTypes) {
      for (const deliveryType of deliveryTypes) {
        const base = buildCloudinarySignedUrl(cloudinary, publicId, {
          resourceType,
          deliveryType,
          expirationSeconds: 300,
        });
        if (base) candidateUrls.add(base);

        for (const format of formats) {
          const withFormat = buildCloudinarySignedUrl(cloudinary, publicId, {
            resourceType,
            deliveryType,
            format,
            expirationSeconds: 300,
          });
          if (withFormat) candidateUrls.add(withFormat);
        }
      }
    }
  }

  for (const url of candidateUrls) {
    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      return {
        filename: resolveAttachmentFilename(doc, response),
        content: Buffer.from(response.data),
      };
    } catch {
      // Try the next candidate.
    }
  }

  // Fast candidates all failed — ask Cloudinary directly what this asset's
  // real resource_type/delivery_type is, then build one exact URL from that.
  const asset = await tryCloudinaryResourceLookup(cloudinary, publicIds, resourceTypes, deliveryTypes);
  if (asset) {
    const exactUrl = buildCloudinarySignedUrl(cloudinary, asset.public_id, {
      resourceType: asset.resource_type,
      deliveryType: asset.type,
      format: asset.format,
      expirationSeconds: 300,
    });
    if (exactUrl) {
      try {
        const response = await axios.get(exactUrl, { responseType: "arraybuffer" });
        return {
          filename: resolveAttachmentFilename(doc, response, asset.format),
          content: Buffer.from(response.data),
        };
      } catch {
        // Fall through to null below.
      }
    }
  }

  console.error(`[DocumentEmail] Could not resolve a working download URL for document "${doc?.name}" (publicId: ${doc?.publicId})`);
  return null;
}

function buildNoCompletionsHtml(user) {
  return `
    <p>Hi ${user.name || "there"},</p>
    <p>No services were completed for you during this period. You'll receive your service documents automatically as soon as a service is marked completed in a future period.</p>
  `;
}

function buildDigestHtml(user, leadsWithAttachments) {
  const sections = leadsWithAttachments
    .map(({ lead, attachments }) => {
      const items = attachments.map((a) => `<li>${a.filename}</li>`).join("");
      return `<p><strong>${lead.serviceName}</strong></p><ul>${items}</ul>`;
    })
    .join("");

  return `
    <p>Hi ${user.name || "there"},</p>
    <p>Here are the documents for the service(s) completed for you during this period, including your uploaded documents, drafts, and final documents.</p>
    ${sections}
    <p>Thank you for choosing Vithartha Consulting.</p>
  `;
}

async function sendDigestForUser(user) {
  const now = new Date();
  const windowStart = user.lastDocumentDigestAt || user.createdAt || new Date(0);

  const completedLeads = await Lead.find({
    user: user._id,
    status: "Completed",
    completedAt: { $ne: null, $gt: windowStart, $lte: now },
    isDeleted: { $ne: true },
  });

  if (completedLeads.length === 0) {
    await sendMail({
      to: user.email,
      subject: "Your service update from Vithartha Consulting",
      html: buildNoCompletionsHtml(user),
    });
  } else {
    const leadsWithAttachments = [];
    for (const lead of completedLeads) {
      const docs = Array.isArray(lead.documents) ? lead.documents : [];
      const attachments = [];
      for (const doc of docs) {
        const attachment = await fetchDocumentAttachment(doc);
        if (attachment) attachments.push(attachment);
      }
      if (attachments.length > 0) {
        leadsWithAttachments.push({ lead, attachments });
      }
    }

    if (leadsWithAttachments.length === 0) {
      console.error(`[DocumentEmail] User ${user._id} had completed leads but no documents could be downloaded; skipping this cycle`);
      return;
    }

    await sendMail({
      to: user.email,
      subject: "Your completed service documents from Vithartha Consulting",
      html: buildDigestHtml(user, leadsWithAttachments),
      attachments: leadsWithAttachments.flatMap((l) => l.attachments),
    });
  }

  user.lastDocumentDigestAt = now;
  user.nextDocumentDigestAt = new Date(now.getTime() + getDigestIntervalMs());
  await user.save();
  console.log(`[DocumentEmail] Sent digest for user ${user._id} (${completedLeads.length} completed service(s))`);
}

export async function runDocumentEmailSweep() {
  let dueUsers;
  try {
    await scheduleUnscheduledUsers();
    dueUsers = await findUsersDueForDigest();
  } catch (err) {
    console.error(`[DocumentEmail] Failed to query due users: ${err.message}`);
    return;
  }

  for (const user of dueUsers) {
    try {
      await sendDigestForUser(user);
    } catch (err) {
      console.error(`[DocumentEmail] Failed to send digest for user ${user._id}: ${err.message}`);
    }
  }
}
