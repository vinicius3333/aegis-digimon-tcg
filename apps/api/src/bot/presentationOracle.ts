import type { ServerEvent } from "@aegis/shared";

export type PresentationAnomalyKind =
  | "effect-not-resolved"
  | "effect-resolved-without-trigger"
  | "security-check-not-closed"
  | "security-check-closed-without-reveal";

export interface PresentationRisk {
  kind: "high-visual-event-density";
  eventIndex: number;
  message: string;
}

export interface PresentationAnomaly {
  kind: PresentationAnomalyKind;
  eventIndex: number;
  message: string;
}

export interface PresentationAnalysis {
  anomalies: PresentationAnomaly[];
  risks: PresentationRisk[];
  eventCount: number;
  maximumVisualEventsPerPhase: number;
}

export interface PresentationOracleOptions {
  /** Maximum consecutive presentation moments before the stream is considered risky. */
  maximumBurst?: number;
}

const DEFAULT_MAXIMUM_BURST = 12;

function effectKey(event: Extract<ServerEvent, { kind: "effectTriggered" | "effectResolved" }>): string {
  const source = event.sourceInstanceId ?? event.sourcePermanentId ?? event.sourceCardId;
  return `${event.seat}:${source}:${event.effectKey}:${event.isInherited === true ? "inherited" : "main"}`;
}

function securityKey(event: Extract<ServerEvent, { kind: "securityRevealed" | "securityChecked" }>): string {
  return `${event.seat}:${event.revealedCardId}`;
}

/**
 * Checks the public server stream for contracts the animation queue relies on. It deliberately
 * consumes only `ServerEvent`: a failing bot seed can therefore be replayed without a browser or
 * private player state, then promoted to visual validation after it has been reduced.
 */
export function analyzePresentationEvents(
  events: readonly ServerEvent[],
  options: PresentationOracleOptions = {},
): PresentationAnalysis {
  const anomalies: PresentationAnomaly[] = [];
  const risks: PresentationRisk[] = [];
  const effects = new Map<string, number[]>();
  const securityChecks = new Map<string, number[]>();
  const maximumBurstAllowed = options.maximumBurst ?? DEFAULT_MAXIMUM_BURST;
  let burst = 0;
  let maximumVisualEventsPerPhase = 0;

  const visualKinds = new Set<ServerEvent["kind"]>([
    "cardPlayed",
    "digivolved",
    "hatched",
    "movedFromBreeding",
    "attackDeclared",
    "blocked",
    "securityRevealed",
    "securityChecked",
    "securityRecovered",
    "cardRevealed",
    "effectActivated",
    "effectTriggered",
    "cardsMoved",
    "turnEnded",
  ]);

  function open(map: Map<string, number[]>, key: string, index: number): void {
    map.set(key, [...(map.get(key) ?? []), index]);
  }

  function close(map: Map<string, number[]>, key: string): number | undefined {
    const entries = map.get(key);
    const openedAt = entries?.shift();
    if (entries?.length === 0) map.delete(key);
    return openedAt;
  }

  events.forEach((event, eventIndex) => {
    if (event.kind === "phaseChanged" || event.kind === "matchStarted" || event.kind === "gameOver") burst = 0;
    else if (visualKinds.has(event.kind)) {
      burst += 1;
      maximumVisualEventsPerPhase = Math.max(maximumVisualEventsPerPhase, burst);
    }

    if (event.kind === "effectTriggered") open(effects, effectKey(event), eventIndex);
    if (event.kind === "effectResolved" && close(effects, effectKey(event)) === undefined) {
      anomalies.push({
        kind: "effect-resolved-without-trigger",
        eventIndex,
        message: `${event.sourceCardId} resolved ${event.effectKey} without a matching trigger`,
      });
    }
    if (event.kind === "securityRevealed") open(securityChecks, securityKey(event), eventIndex);
    if (event.kind === "securityChecked" && close(securityChecks, securityKey(event)) === undefined) {
      anomalies.push({
        kind: "security-check-closed-without-reveal",
        eventIndex,
        message: `${event.revealedCardId} closed a security check without a matching reveal`,
      });
    }
  });

  for (const [key, indices] of effects) {
    for (const eventIndex of indices) {
      anomalies.push({ kind: "effect-not-resolved", eventIndex, message: `${key} triggered but never resolved` });
    }
  }
  for (const [key, indices] of securityChecks) {
    for (const eventIndex of indices) {
      anomalies.push({
        kind: "security-check-not-closed",
        eventIndex,
        message: `${key} was revealed but never closed`,
      });
    }
  }
  if (maximumVisualEventsPerPhase > maximumBurstAllowed) {
    risks.push({
      kind: "high-visual-event-density",
      eventIndex: events.length - 1,
      message: `${maximumVisualEventsPerPhase} visual events in one phase exceed the review threshold of ${maximumBurstAllowed}`,
    });
  }

  return { anomalies, risks, eventCount: events.length, maximumVisualEventsPerPhase };
}
