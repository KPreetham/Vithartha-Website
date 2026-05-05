import axios from 'axios';
import { toast } from 'react-hot-toast';

const extractCloudinaryPublicIdFromUrl = (url) => {
  const rawUrl = String(url || "").trim();
  if (!rawUrl) return "";

  try {
    const parsed = new URL(rawUrl);
    const uploadMarker = "/upload/";
    const markerIndex = parsed.pathname.indexOf(uploadMarker);
    if (markerIndex === -1) return "";

    let publicIdPart = parsed.pathname.slice(markerIndex + uploadMarker.length);
    publicIdPart = publicIdPart.replace(/^v\d+\//, "");
    publicIdPart = publicIdPart.replace(/\.[a-z0-9]+$/i, "");
    return publicIdPart.trim();
  } catch {
    return "";
  }
};

/**
 * Builds a short-lived backend stream URL for a document.
 * @param {string} publicId - The Cloudinary public ID of the document.
 * @param {string} url - The stored document URL, used only to resolve older records.
 * @param {string} leadId - The ID of the lead the document belongs to (for authorization).
 */
export const getSecureDocumentUrl = async (publicId, url, leadId) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const user = JSON.parse(localStorage.getItem("user"));
  const authToken = user?.token;

  if (!authToken) {
    throw new Error("Please log in to view documents");
  }

  let resolvedPublicId = publicId;

  if (!resolvedPublicId) {
    resolvedPublicId = extractCloudinaryPublicIdFromUrl(url);
  }

  if (!resolvedPublicId && leadId && url) {
    const leadRes = await axios.get(`${apiUrl}/leads/${encodeURIComponent(leadId)}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const lead = leadRes.data;
    const matchingDoc = Array.isArray(lead?.documents)
      ? lead.documents.find((doc) => {
          if (!doc) return false;
          return String(doc.url || "").trim() === String(url || "").trim();
        })
      : null;

    resolvedPublicId =
      matchingDoc?.publicId || extractCloudinaryPublicIdFromUrl(matchingDoc?.url || "");
  }

  if (!resolvedPublicId) {
    throw new Error("Document identifier is missing.");
  }

  const response = await axios.get(
    `${apiUrl}/leads/view-token/${encodeURIComponent(resolvedPublicId)}`,
    {
      params: { id: leadId },
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );

  if (response.data.success && response.data.token) {
    return `${apiUrl}/leads/stream/${response.data.token}`;
  }

  throw new Error("Failed to get view token");
};

export const viewDocument = async (publicId, url, leadId) => {
  const loadingToast = toast.loading("Preparing document...");
  const previewTab = window.open("about:blank", "_blank");

  if (previewTab) {
    previewTab.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Preparing document...</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              background: #0f1115;
              color: #e5e7eb;
              font-family: Arial, sans-serif;
            }
            .card {
              padding: 24px 28px;
              border-radius: 16px;
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.08);
              box-shadow: 0 18px 50px rgba(0,0,0,0.35);
              text-align: center;
            }
            .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
            .sub { font-size: 14px; opacity: 0.8; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="title">Preparing secure document</div>
            <div class="sub">Please wait while we verify access.</div>
          </div>
        </body>
      </html>
    `);
    previewTab.document.close();
  }

  try {
    const viewUrl = await getSecureDocumentUrl(publicId, url, leadId);
    if (previewTab && !previewTab.closed) {
      previewTab.location.href = viewUrl;
    } else {
      window.open(viewUrl, "_blank", "noopener,noreferrer");
    }
    toast.dismiss(loadingToast);
  } catch (error) {
    console.error("[DocumentViewer] Error fetching view token:", error);
    if (previewTab && !previewTab.closed) {
      previewTab.close();
    }
    toast.error(
      error.response?.status === 401
        ? "This document link expired. Please click View again to generate a fresh link."
        : error.response?.data?.message || error.message || "Failed to open document securely. Please try again.",
      { id: loadingToast },
    );
  }
};
