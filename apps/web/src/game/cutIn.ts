/* The full-screen digivolution cut-in: card art centre-screen over an animated
   colour band, with the word "Digivolution" across it, before the board shows
   what landed (`EvolutionEffectObject.cs` and its tier subclasses).

   The reference client tiers the cut-in by how the digivolution happened — a
   plain evolution holds 1.45 s, a DigiXros 2.0 s with a shake, DNA 1.65 s and a
   Burst evolution 2.7 s. Only the DigiXros tier is reachable from here: the
   protocol says a card was digivolved, not by which mechanic, and DigiXros is the
   one mechanic the shared card data itself identifies (`digiXrosRequirementFor`).
   The DNA and Burst tiers are deliberately absent rather than guessed at — they
   would need the server to name the mechanic on the event.

   Pure: this module decides which event earns a cut-in and in which tier, not
   when one is on screen. */

import type { Seat, ServerEvent } from "@aegis/shared";
import { digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { colorKey, type ColorName } from "../design/theme";

/** The tiers the protocol can actually distinguish. */
export type CutInTier = "base" | "digiXros";

export interface DigivolutionCutIn {
  key: number;
  cardId: string;
  seat: Seat;
  tier: CutInTier;
  /** The card's own colour, which the band behind it is keyed to. */
  color: ColorName;
}

/**
 * The level from which a digivolution is grand enough to be announced. The
 * reference client cuts in from Mega upward, which is level 6.
 */
export const CUT_IN_MIN_LEVEL = 6;

/** The printed bracket that makes a played Digimon worth announcing as well. */
const ON_PLAY_CLAUSE = /\[On Play\]/;

function tierFor(cardId: string): CutInTier {
  return (digiXrosRequirementFor(cardId) ?? []).length > 0 ? "digiXros" : "base";
}

/**
 * The cut-in an event earns, or null when it earns none.
 *
 * A digivolution to level 6 or higher always earns one. A *play* of such a card
 * earns one only when the card prints an [On Play] clause: an ordinary hard-played
 * Mega is a card landing on the board, while one that fires on arrival is the beat
 * the reference client punctuates. Both seats are announced — a cut-in is how the
 * opponent's big turn reads.
 */
export function cutInFromEvent(event: ServerEvent, key: number, enabled: boolean): DigivolutionCutIn | null {
  if (!enabled) return null;
  if (event.kind !== "digivolved" && event.kind !== "cardPlayed") return null;
  const definition = getCardDefinition(event.cardId);
  if (!definition || (definition.level ?? 0) < CUT_IN_MIN_LEVEL) return null;
  if (event.kind === "cardPlayed") {
    if (!event.permanentId) return null;
    if (!ON_PLAY_CLAUSE.test(definition.effectText ?? "")) return null;
  }
  return {
    key,
    cardId: event.cardId,
    seat: event.seat,
    tier: tierFor(event.cardId),
    color: colorKey(definition.colors[0]),
  };
}
