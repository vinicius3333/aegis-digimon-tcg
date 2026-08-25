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

/** What the centre-screen card is announcing. */
export type ZoneShowcaseKind = "play" | "digivolve";

export interface ZoneShowcase {
  key: number;
  kind: ZoneShowcaseKind;
  cardId: string;
  seat: Seat;
  /** Card colour, so the halo behind the card matches the card. */
  color: ColorName;
}

/** The looks the shared burst component can wear. */
export type BurstVariant = "play" | "evolve" | "hatch" | "draw";

export interface PermanentBurst {
  key: number;
  permanentId: string;
  variant: Exclude<BurstVariant, "draw">;
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
 * Only the opponent's moves are announced this way: the viewer dragged their own
 * card and already watched it leave their hand, so their play keeps the field
 * burst and skips the hold. An evolution the viewer's own effect performed is
 * not distinguishable from a dragged one on the event payload alone, so it is
 * left out rather than guessed at.
 */
export function zoneShowcaseFromEvent(event: ServerEvent, viewerSeat: Seat, key: number): ZoneShowcase | null {
  if (event.kind !== "cardPlayed" && event.kind !== "digivolved") return null;
  if (event.seat === viewerSeat) return null;
  return {
    key,
    kind: event.kind === "cardPlayed" ? "play" : "digivolve",
    cardId: event.cardId,
    seat: event.seat,
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
        inBreeding: false,
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
    case "play":
      return { base: COLORS[color].base, edge: COLORS[color].edge };
  }
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
