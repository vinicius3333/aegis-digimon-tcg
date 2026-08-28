/* The pulse a permanent gives off when its DP moves: green particles rising on a
   buff, red falling on a debuff, and a longer hold when the debuff takes the
   Digimon to nothing — the reference client's own tell that the number the player
   is watching is about to matter.

   The driver is the synchronized `Permanent.currentDP` itself, diffed between two
   commits. That is server truth read straight off the board, not a rule the client
   re-derives: the engine has already applied every modifier by the time the value
   changes. Pure. */

export type DpPulseKind = "buff" | "debuff" | "debuffFatal";

export interface DpPulse {
  permanentId: string;
  kind: DpPulseKind;
  from: number;
  to: number;
  /** Re-mounts the pulse so a second change on the same card restarts its keyframes. */
  key: number;
}

/** DP at or below zero is the point a Digimon stops surviving its own modifiers. */
const FATAL_DP = 0;

/**
 * Every DP change between two board reads, keyed by permanent. A permanent absent
 * from either side (one that just arrived, or one that just left) raises nothing:
 * its card is already entering or leaving on a cue of its own.
 */
export function dpPulses({
  previous,
  next,
  nextKey,
}: {
  previous: ReadonlyMap<string, number>;
  next: ReadonlyMap<string, number>;
  /** The first key to hand out; each pulse takes the next one. */
  nextKey: number;
}): DpPulse[] {
  const pulses: DpPulse[] = [];
  let key = nextKey;
  for (const [permanentId, to] of next) {
    const from = previous.get(permanentId);
    if (from === undefined || from === to) continue;
    key += 1;
    pulses.push({ permanentId, kind: dpPulseKind(from, to), from, to, key });
  }
  return pulses;
}

/** Which of the three pulses a change earns. */
export function dpPulseKind(from: number, to: number): DpPulseKind {
  if (to > from) return "buff";
  return to <= FATAL_DP ? "debuffFatal" : "debuff";
}
