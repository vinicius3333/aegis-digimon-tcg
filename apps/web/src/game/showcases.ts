/* Zone-change showcases: what the board plays when a card leaves one zone and
   appears in another.

   The reference client never flies a card from one zone rectangle to another. A
   zone change is hide → centre-screen overlay → reveal (battle-animation-spec.md,
   "Cross-cutting notes" §1), and every landing is punctuated by the same
   colour-keyed burst — one component, keyed by the effect's colour vocabulary:
   a play takes the card's own colour, an evolution burns red/orange, a hatch
   opens white/blue.

   This module is the pure half: it decides, from a server event alone, which
   showcase and which burst an event earns. It reads no rules and infers no game
   state — seat, zone and card identity all come off the event payload. */

import type { Seat, ServerEvent } from "@aegis/shared";
import { getCardDefinition } from "@aegis/shared";
import { COLORS, colorKey, type ColorName } from "../design/theme";

export interface ZoneShowcase {
  key: number;
  cardId: string;
  seat: Seat;
  /** What the hold announces: a card arriving from hand or one digivolving in breeding. */
  kind: "play" | "digivolve";
  /** Card colour, so the halo behind the card matches the card. */
  color: ColorName;
}

/** The looks the shared burst component can wear. */
export type BurstVariant = "play" | "evolve" | "hatch" | "draw" | "delete" | "shatter";

export interface PermanentBurst {
  key: number;
  permanentId: string;
  variant: Exclude<BurstVariant, "draw" | "shatter">;
  color: ColorName;
  /** The breeding area rather than the battle area, which is lit differently. */
  inBreeding: boolean;
}

/** The palette key a card's burst is drawn in. */
export function burstColorFor(cardId: string): ColorName {
  return colorKey(getCardDefinition(cardId)?.colors[0]);
}

/**
 * The centre-screen showcase an event earns, or null when it earns none.
 *
 * Only the opponent's arrivals are announced this way: the viewer dragged their
 * own card and already watched it leave their hand, so their move keeps the
 * field burst and skips the hold. A battle-area digivolution is read off the
 * board itself — the stack changes where it stands, under its own burst — but a
 * breeding digivolution happens in a corner slot the viewer is not watching, so
 * the opponent's is held centre-screen like a play.
 */
export function zoneShowcaseFromEvent(event: ServerEvent, viewerSeat: Seat, key: number): ZoneShowcase | null {
  if (event.kind !== "cardPlayed" && !(event.kind === "digivolved" && event.inBreeding)) return null;
  if (event.seat === viewerSeat) return null;
  return {
    key,
    cardId: event.cardId,
    seat: event.seat,
    kind: event.kind === "digivolved" ? "digivolve" : "play",
    color: burstColorFor(event.cardId),
  };
}

/**
 * The burst a permanent earns where it lands, for either seat. A play and a move
 * out of breeding are both arrivals in the battle area; a digivolution burns over
 * the stack it grew; a hatch opens in the breeding slot.
 */
export function permanentBurstFromEvent(event: ServerEvent, key: number): PermanentBurst | null {
  switch (event.kind) {
    case "cardPlayed":
      // An Option resolves without ever becoming a permanent, so it has nothing
      // on the field to burst behind.
      if (!event.permanentId) return null;
      return {
        key,
        permanentId: event.permanentId,
        variant: "play",
        color: burstColorFor(event.cardId),
        inBreeding: false,
      };
    case "movedFromBreeding":
      return {
        key,
        permanentId: event.permanentId,
        variant: "play",
        color: burstColorFor(event.cardId),
        inBreeding: false,
      };
    case "digivolved":
      return {
        key,
        permanentId: event.permanentId,
        variant: "evolve",
        color: burstColorFor(event.cardId),
        inBreeding: event.inBreeding ?? false,
      };
    case "hatched":
      return {
        key,
        permanentId: event.permanentId,
        variant: "hatch",
        color: burstColorFor(event.cardId),
        inBreeding: true,
      };
    default:
      return null;
  }
}

/** The two tones one burst is drawn in: the bright centre and the outer edge. */
export interface BurstPalette {
  base: string;
  edge: string;
}

/**
 * The effect-colour vocabulary of the reference client
 * (battle-animation-spec.md, "Effect colour vocabulary"): an arrival takes the
 * card's own colour, an evolution burns red into orange, a hatch opens white
 * into blue, and a drawn card lands on the same blue starburst.
 */
export function burstPalette(variant: BurstVariant, color: ColorName = "Neutral"): BurstPalette {
  switch (variant) {
    case "evolve":
      return { base: "#ffb347", edge: "#e0362c" };
    case "hatch":
      return { base: "#ffffff", edge: "#7fc4ff" };
    case "draw":
      return { base: "#d6e9ff", edge: "#2f6fe0" };
    // A deletion burns orange out of a green ring, the reference client's colour for a
    // Digimon leaving the field; a shattering pane is the same blue as the security glass.
    case "delete":
      return { base: "#ff9f43", edge: "#3ddc84" };
    case "shatter":
      return { base: "#e4f1ff", edge: "#3b82f6" };
    case "play":
      return { base: COLORS[color].base, edge: COLORS[color].edge };
  }
}

/** The zone names `cardsMoved` uses for a deletion: off the field, into the trash. */
const BATTLE_AREA_ZONE = "battleArea";
const TRASH_ZONE = "trash";

/**
 * What an event says just left the field, as ids the board can be asked to locate. A
 * combat resolution names permanents; an effect that trashes a permanent narrates the card
 * instance instead, so both are returned as anchors and the caller resolves whichever it
 * has a last position for.
 */
export function deletionAnchorIdsFromEvent(event: ServerEvent): readonly string[] {
  if (event.kind === "combatResolved") return event.deletedPermanentIds;
  if (event.kind === "cardsMoved" && event.from === BATTLE_AREA_ZONE && event.to === TRASH_ZONE) {
    return event.instanceIds;
  }
  return [];
}

/** The phase name the protocol uses for the draw step of a turn. */
const DRAW_PHASE = "Draw";

/**
 * Whether a hand that grew during this batch of events grew because the turn
 * started. The draw phase is announced by `phaseChanged`, so a draw observed
 * alongside it is the turn-start draw and earns the starburst at the hand slot;
 * a draw an effect caused arrives with no phase change and keeps only its notice.
 */
export function hasTurnStartDraw(events: readonly ServerEvent[], seat: Seat): boolean {
  return events.some((event) => event.kind === "phaseChanged" && event.phase === DRAW_PHASE && event.turnSeat === seat);
}
