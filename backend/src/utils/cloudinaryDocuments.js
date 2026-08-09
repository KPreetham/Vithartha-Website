// Cloudinary stores each document under a resource_type ("image"/"raw"/"video")
// decided at upload time from resource_type: "auto" — that decision isn't
// recorded on the Lead document, so any code building a delivery URL later
// has to try several resource_type/delivery_type/format combinations rather
// than assume one. Shared by leadController's streamDocument/getSignedUrl
// and documentEmailService's attachment downloader.

export const normalizeDocumentUrl = (value) =>
  String(value || "").trim().replace(/^http:/i, "https:");

export const CLOUDINARY_RESOURCE_TYPES = new Set(["image", "raw", "video", "auto"]);
export const CLOUDINARY_DELIVERY_TYPES = new Set(["authenticated", "upload"]);

export const uniqueValues = (values) => Array.from(new Set(values.filter(Boolean)));

export const parseCloudinaryAssetUrl = (value) => {
  const normalizedUrl = normalizeDocumentUrl(value);
  if (!normalizedUrl || !normalizedUrl.includes("res.cloudinary.com")) {
    return null;
  }

  try {
    const parsed = new URL(normalizedUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const resourceIndex = parts.findIndex((part) =>
      CLOUDINARY_RESOURCE_TYPES.has(part),
    );

    if (resourceIndex === -1 || resourceIndex + 1 >= parts.length) {
      return null;
    }

    const resourceType = parts[resourceIndex];
    const deliveryType = parts[resourceIndex + 1];
    const remainingParts = parts.slice(resourceIndex + 2);
    const signatureIndex = remainingParts.findIndex((part) =>
      /^s--[^/]+--$/.test(part),
    );
    const afterSignature =
      signatureIndex >= 0
        ? remainingParts.slice(signatureIndex + 1)
        : remainingParts;
    const versionIndex = afterSignature.findIndex((part) => /^v\d+$/.test(part));

    if (versionIndex === -1) {
      return {
        normalizedUrl,
        resourceType,
        deliveryType,
      };
    }

    const assetPath = afterSignature.slice(versionIndex + 1).join("/");
    const publicIdWithFormat = assetPath.trim();
    const publicId = publicIdWithFormat.replace(/\.[a-z0-9]+$/i, "");
    const format = (publicIdWithFormat.match(/\.([a-z0-9]+)$/i) || [])[1] || "";

    return {
      normalizedUrl,
      resourceType,
      deliveryType,
      publicId,
      publicIdWithFormat,
      format,
    };
  } catch {
    return null;
  }
};

export const buildCloudinarySignedUrl = (
  cloudinary,
  publicId,
  {
    resourceType = "auto",
    deliveryType = "authenticated",
    format = null,
    expirationSeconds = 3600,
  } = {},
) => {
  const resolvedPublicId = String(publicId || "").trim();
  if (!resolvedPublicId || resolvedPublicId.startsWith("http")) {
    return "";
  }

  try {
    const options = {
      sign_url: true,
      type: deliveryType,
      secure: true,
      resource_type: resourceType,
      expires_at: Math.floor(Date.now() / 1000) + expirationSeconds,
    };

    if (format) {
      options.format = format;
    }

    return cloudinary.url(resolvedPublicId, options);
  } catch {
    return "";
  }
};

export const tryCloudinaryResourceLookup = async (
  cloudinary,
  publicIds,
  resourceTypes,
  deliveryTypes,
) => {
  for (const publicId of publicIds) {
    for (const resourceType of resourceTypes) {
      for (const deliveryType of deliveryTypes) {
        try {
          const asset = await cloudinary.api.resource(publicId, {
            resource_type: resourceType,
            type: deliveryType,
          });

          if (asset) {
            return asset;
          }
        } catch {
          // Try the next combination.
        }
      }
    }
  }

  return null;
};
