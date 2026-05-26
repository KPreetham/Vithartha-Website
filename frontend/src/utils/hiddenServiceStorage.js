const STORAGE_PREFIX = "dashboard-hidden-services";

const getStorageKey = (dashboardName, userId) => {
  const normalizedDashboard = String(dashboardName || "").trim();
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedDashboard || !normalizedUserId) {
    return "";
  }

  return `${STORAGE_PREFIX}:${normalizedDashboard}:${normalizedUserId}`;
};

export const loadHiddenServiceIds = (dashboardName, userId) => {
  if (typeof window === "undefined") {
    return [];
  }

  const storageKey = getStorageKey(dashboardName, userId);
  if (!storageKey) {
    return [];
  }

  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue)
      ? [...new Set(parsedValue.map((value) => String(value).trim()).filter(Boolean))]
      : [];
  } catch {
    return [];
  }
};

export const saveHiddenServiceIds = (dashboardName, userId, ids) => {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getStorageKey(dashboardName, userId);
  if (!storageKey) {
    return;
  }

  const normalizedIds = Array.isArray(ids)
    ? [...new Set(ids.map((value) => String(value).trim()).filter(Boolean))]
    : [];

  localStorage.setItem(storageKey, JSON.stringify(normalizedIds));
};