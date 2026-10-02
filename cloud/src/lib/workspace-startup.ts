export type StartupStatus = "loading" | "ready" | "offline" | "invalid" | "error";

/**
 * Pure startup decision. A stored credential is never discarded automatically:
 * - valid → use it
 * - unreachable (network/500) → keep using it, flagged offline
 * - invalid (wrong key) → keep it stored and ask the user what to do
 * - nothing stored → create a new anonymous space
 */
export function decideStartup(
  stored: string | null,
  outcome: "valid" | "invalid" | "unreachable" | "none",
): { action: "use"; status: "ready" | "offline" } | { action: "ask" } | { action: "create" } {
  if (!stored) return { action: "create" };
  if (outcome === "valid") return { action: "use", status: "ready" };
  if (outcome === "unreachable") return { action: "use", status: "offline" };
  return { action: "ask" };
}
