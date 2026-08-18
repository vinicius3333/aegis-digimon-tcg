const TRIGGER_KEY_SEPARATOR = "::";

/**
 * Build the per-instance key an `orderTriggers` decision uses to identify one
 * triggering permanent's effect. `effectKey` alone (`cardId/effect-index`) is
 * shared by every permanent of the same card, so two copies of the same card
 * triggering simultaneously would collide on a single decision entry — see
 * resolverDecisions.ts. Prefixing with the source permanent's `instanceId`
 * (unique per physical card, unlike `cardId`) makes each entry independently
 * addressable end-to-end: engine -> DecisionRequest -> client overlay ->
 * respondDecision -> engine resolution.
 */
export function buildTriggerKey(instanceId: string, effectKey: string): string {
  return `${instanceId}${TRIGGER_KEY_SEPARATOR}${effectKey}`;
}

/** Inverse of `buildTriggerKey`. Tolerates a bare (pre-fix or malformed) key by treating it as the effectKey with an empty instanceId. */
export function parseTriggerKey(triggerKey: string): { instanceId: string; effectKey: string } {
  const sepAt = triggerKey.indexOf(TRIGGER_KEY_SEPARATOR);
  if (sepAt === -1) return { instanceId: "", effectKey: triggerKey };
  return {
    instanceId: triggerKey.slice(0, sepAt),
    effectKey: triggerKey.slice(sepAt + TRIGGER_KEY_SEPARATOR.length),
  };
}
