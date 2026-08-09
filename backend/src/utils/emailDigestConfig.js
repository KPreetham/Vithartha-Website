// Shared by the User model (to schedule each new user's first digest) and
// documentEmailService (to schedule the next digest after one is sent).
export function getDigestIntervalMs() {
  const hours = Number(process.env.DOCUMENT_EMAIL_INTERVAL_HOURS);
  return (Number.isFinite(hours) && hours > 0 ? hours : 24 * 30) * 60 * 60 * 1000;
}
