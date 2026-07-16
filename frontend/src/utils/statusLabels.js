/**
 * Shared status label helpers used across all dashboards (Admin, PR, User, Executor).
 * Single source of truth — update here to sync everywhere.
 */

/**
 * Converts a raw assignedExecutor value like "executor1" → "Executor 1".
 * Falls back to "Executor" when not set.
 */
export const resolveExecutorLabel = (lead) => {
  const raw = String(lead?.assignedExecutor || "").trim().toLowerCase();
  const match = raw.match(/^executor(\d+)$/);
  if (match) return `Executor ${match[1]}`;
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);
  return "Executor";
};

/**
 * True once every document name in lead.documentsRequired has a matching
 * uploaded (url-bearing) entry in lead.documents. Used to distinguish
 * "client still uploading" from "ready for admin to review" while the lead
 * is still sitting in the "Open" status.
 */
export const areAllRequiredDocumentsUploaded = (lead) => {
  const requiredNames = Array.isArray(lead?.documentsRequired) ? lead.documentsRequired : [];
  if (requiredNames.length === 0) return false;
  const docs = Array.isArray(lead?.documents) ? lead.documents : [];
  return requiredNames.every((name) => {
    const key = String(name || "").trim().toLowerCase();
    return docs.some((d) => {
      const docKey = String(d?.name || "").trim().toLowerCase();
      return docKey === key && !!(d?.url || d?.publicId || d?.secure_url || d?.uploadedUrl);
    });
  });
};

/**
 * True while the lead is still in the admin's own "Open" pre-review stage and
 * the admin has rejected one or more of the client's uploaded documents (and
 * the client hasn't reuploaded them yet — a reupload resets the doc status
 * back to "Pending"). Draft/Final documents go through their own review flow
 * and are excluded here.
 */
export const hasAdminRejectedDocuments = (lead) => {
  const docs = Array.isArray(lead?.documents) ? lead.documents : [];
  return docs.some((d) => {
    const type = String(d?.type || "").trim().toLowerCase();
    if (type === "draft" || type === "final") return false;
    return String(d?.status || "").trim().toLowerCase() === "rejected";
  });
};

/**
 * True when EVERY required document has been rejected by the admin (as opposed
 * to just some of them). Treated as a near-restart of the service — the client
 * has nothing usable on file until they reupload, so progress should drop back
 * close to 0% rather than the partial-rejection value.
 */
export const allAdminRequiredDocumentsRejected = (lead) => {
  const requiredNames = Array.isArray(lead?.documentsRequired) ? lead.documentsRequired : [];
  if (requiredNames.length === 0) return false;
  const docs = Array.isArray(lead?.documents) ? lead.documents : [];
  return requiredNames.every((name) => {
    const key = String(name || "").trim().toLowerCase();
    return docs.some((d) => {
      const docKey = String(d?.name || "").trim().toLowerCase();
      const type = String(d?.type || "").trim().toLowerCase();
      if (type === "draft" || type === "final") return false;
      return docKey === key && String(d?.status || "").trim().toLowerCase() === "rejected";
    });
  });
};

/**
 * True while a lead with admin-required documents is still in its very first,
 * still-"Open" submission cycle — the user has been uploading files (each one
 * is written to the lead as soon as it's picked, so the "Confirm & Submit"
 * payment gate can validate the full set) but hasn't yet completed payment and
 * clicked "Submit" (initialSubmissionConfirmed). Used to keep those client
 * uploads out of both the User and Admin dashboards until that happens; later
 * reupload cycles after the lead has been forwarded past "Open" are never
 * re-hidden by this check.
 */
export const isPreSubmissionStage = (lead) => {
  const hasAdminRequiredDocs = Array.isArray(lead?.documentsRequired) && lead.documentsRequired.length > 0;
  return (
    hasAdminRequiredDocs &&
    String(lead?.status || "").trim().toLowerCase() === "open" &&
    lead?.initialSubmissionConfirmed !== true
  );
};

/**
 * Returns a human-readable display label for a given status + lead.
 * Role-specific overrides can be applied via the `role` parameter:
 *   "admin" | "pr" | "user" | "executor"
 *
 * Statuses that carry executor identity (AssignedToExecutor, InProgress) show
 * the actual executor name when available.
 */
export const getStatusLabel = (status, lead, role = "user") => {
  const s = String(status || "").trim().toLowerCase();
  const executorLabel = resolveExecutorLabel(lead);

  // Rejection — detect origin (executor vs PR)
  if (s === "rejected") {
    const execMsg = String(lead?.executorMessage || "").toLowerCase();
    const prMsg   = String(lead?.prFeedback || "").toLowerCase();
    const adminMsg = String(lead?.adminMessage || "").toLowerCase();
    const isExecutorOrigin =
      execMsg.length > 0 ||
      prMsg.includes("executor") || prMsg.includes("assignment") ||
      adminMsg.includes("executor") || adminMsg.includes("assignment");
    return isExecutorOrigin ? "Rejected by Executor" : "Rejected by PR";
  }

  const map = {
    open:               lead?.documentsSentToUser
                           ? (allAdminRequiredDocumentsRejected(lead)
                               ? "All Documents Rejected by Admin"
                               : hasAdminRejectedDocuments(lead)
                                 ? "Documents Rejected by Admin"
                                 // Only flip to "Admin Reviewing" once the user has completed
                                 // payment and clicked Submit (initialSubmissionConfirmed) —
                                 // uploading every required file isn't submission by itself.
                                 : (areAllRequiredDocumentsUploaded(lead) && lead?.initialSubmissionConfirmed === true)
                                   ? "Admin Reviewing"
                                   : "Pending Client Documents Upload")
                           : role === "pr" ? "New Request" : "Pending Admin Review",
    pendingreview:      role === "pr" ? "PR Reviewing"           : "PR Reviewing",
    informationrequired: role === "pr" ? "Rejected by PR"         : "Rejected by PR",
    pr_accepted:        "Pending Executor Assignment",
    assignedtoexecutor: `Assigned to ${executorLabel}`,
    inprogress:         `Accepted by ${executorLabel}`,
    executionfinished:  role === "executor" ? "Draft Uploaded"
                      : `Draft Uploaded by ${executorLabel}`,
    draftsent:          role === "user"     ? "Review Draft"      : "Waiting for User Draft Approval",
    draftrejected:      "Draft Rejected by User",
    draftaccepted:      "Draft Accepted",
    useraccepted:       "Draft Accepted",
    completed:          "Service Completed",
    closed:             "Closed",
    // Executor rejected the service but PR hasn't notified the client yet
    pendingprreview:    role === "executor" ? "Pending PR Review" : "Executor Rejected (Notify Client)",
  };

  return map[s] ?? status;
};
