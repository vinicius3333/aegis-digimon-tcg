import type { PresentationReport } from "@aegis/shared";

/** Keep client diagnostics bounded and copy only the fields the log understands. */
export function parsePresentationReport(payload: unknown): PresentationReport | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
  const value = payload as Record<string, unknown>;
  const shortText = (field: unknown) => typeof field === "string" && /^[\w./:-]{1,160}$/.test(field);
  const number = (field: unknown) => typeof field === "number" && Number.isFinite(field) && field >= 0;
  if (
    !shortText(value.stepId) ||
    !shortText(value.track) ||
    !["queued", "started", "shown", "finished", "dropped"].includes(value.phase as string) ||
    !["live", "drain", "replay"].includes(value.mode as string) ||
    !number(value.clientTimestamp) ||
    !number(value.pendingCount) ||
    (value.pendingCount as number) > 10000 ||
    !Number.isInteger(value.pendingCount) ||
    typeof value.cancelled !== "boolean" ||
    typeof value.skipping !== "boolean" ||
    typeof value.failed !== "boolean" ||
    (value.batchId !== undefined && !shortText(value.batchId)) ||
    (value.sourceCardId !== undefined && !shortText(value.sourceCardId)) ||
    (value.timing !== undefined && !(typeof value.timing === "string" && /^[\w ./:-]{1,160}$/.test(value.timing))) ||
    (value.side !== undefined && !["you", "opp"].includes(value.side as string)) ||
    (value.stateVersion !== undefined && (!number(value.stateVersion) || !Number.isInteger(value.stateVersion))) ||
    (value.durationMs !== undefined && (!number(value.durationMs) || (value.durationMs as number) > 3_600_000))
  )
    return;
  return {
    phase: value.phase as PresentationReport["phase"],
    stepId: value.stepId as string,
    track: value.track as string,
    clientTimestamp: value.clientTimestamp as number,
    pendingCount: value.pendingCount as number,
    mode: value.mode as PresentationReport["mode"],
    cancelled: value.cancelled,
    skipping: value.skipping,
    failed: value.failed,
    ...(value.batchId !== undefined ? { batchId: value.batchId as string } : {}),
    ...(value.sourceCardId !== undefined ? { sourceCardId: value.sourceCardId as string } : {}),
    ...(value.timing !== undefined ? { timing: value.timing as string } : {}),
    ...(value.side !== undefined ? { side: value.side as PresentationReport["side"] } : {}),
    ...(value.stateVersion !== undefined ? { stateVersion: value.stateVersion as number } : {}),
    ...(value.durationMs !== undefined ? { durationMs: value.durationMs as number } : {}),
  };
}
