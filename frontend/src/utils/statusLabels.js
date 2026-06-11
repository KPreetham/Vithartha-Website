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
    open:               role === "pr" ? "New Request"            : "Pending Verification",
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
