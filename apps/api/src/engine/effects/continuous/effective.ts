import { CardKind, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { findPermanentInState } from "../../state/access.js";
import type { ContinuousEffectLedger } from "../continuous.js";
import type { PlayMatch } from "./policies.js";

/**
 * Reading a permanent's effective identity — the printed card plus whatever the
 * ledger grants it — and the two predicates the play prohibitions match with.
 */

/** Whether a prohibition `mode` covers the requested play/move action. */
export function modeMatches(mode: "play" | "move" | "playOrMove", requested: "play" | "move"): boolean {
  return mode === "playOrMove" || mode === requested;
}

/** Does a card definition satisfy a PlayMatch predicate (kind AND optional DP cap)? */
export function playMatchesCard(match: PlayMatch, def: CardDefinition): boolean {
  if (def.isToken === true && match.allowTokens !== true) return false;
  if (match.kinds !== undefined && match.kinds.length > 0) {
    // Mother Eater is catalogued as a Digi-Egg because it begins in that deck, but its
    // own effect can play it into the battle area as a Digimon. Play prohibitions that
    // name Digimon therefore apply to that effect play (BT22-007 Q4861).
    const motherEaterAsDigimon = def.cardId === "BT22-007" && match.kinds.includes(CardKind.Digimon);
    if (!motherEaterAsDigimon && !match.kinds.some((k) => def.kinds.includes(k as CardKind))) return false;
  }
  if (match.dpAtMost !== undefined && def.dp > match.dpAtMost) return false;
  return true;
}

export function ownerSeatOfPermanent(state: GameState, permanentId: string): Seat {
  return findPermanentInState(state, permanentId)?.controllerSeat ?? 0;
}

/** Re-export the matcher so consumers can resolve a permanent's effective name set. */
export function effectiveNames(ledger: ContinuousEffectLedger, permanent: Permanent, printedName: string): string[] {
  const original = ledger.originalCardInfoOverride(permanent.permanentId)?.name ?? printedName;
  return [original.toLowerCase(), ...ledger.grantedNames(permanent.permanentId)];
}

/**
 * A permanent's EFFECTIVE color set: its printed colors UNIONED with every continuously
 * (BaseCardColors then each active color-grant appends, then Distinct; documented behavior).
 * The color-legality consumers read this instead of the printed colors so an "also treated
 * as <color>" grant is observed. `printedColors` are CardColor values (strings).
 */
export function effectiveColors(
  ledger: ContinuousEffectLedger,
  permanentId: string,
  printedColors: readonly string[],
): string[] {
  const original = ledger.originalCardInfoOverride(permanentId)?.colors ?? printedColors;
  const seen = new Set<string>(original);
  for (const color of ledger.grantedColors(permanentId)) seen.add(color);
  return [...seen];
}

/**
 * A permanent's EFFECTIVE card kinds: its printed `CardDefinition.kinds` UNIONED
 * layering (static kinds then each active KindGrant appends). The type-check
 * gates (combat legality, effect filter matching) read this instead of the
 * printed kinds so a "treated as a Digimon" grant (HARD-01) is observed.
 */
export function effectiveKinds(
  ledger: ContinuousEffectLedger,
  permanentId: string,
  printedKinds: readonly CardKind[],
): CardKind[] {
  const seen = new Set<CardKind>(printedKinds);
  for (const k of ledger.grantedKinds(permanentId)) seen.add(k);
  return [...seen];
}

/** A permanent's printed traits unioned with active runtime trait grants. */
export function effectiveTraits(
  ledger: ContinuousEffectLedger,
  permanentId: string,
  printedTraits: readonly string[],
): string[] {
  const byLowercase = new Map<string, string>();
  for (const trait of printedTraits) byLowercase.set(trait.toLowerCase(), trait);
  for (const trait of ledger.grantedTraits(permanentId)) {
    if (!byLowercase.has(trait.toLowerCase())) byLowercase.set(trait.toLowerCase(), trait);
  }
  return [...byLowercase.values()];
}
