/* The full-screen digivolution cut-in: card art centre-screen over an animated
   colour band, with the word "Digivolution" across it, before the board shows
   what landed (`EvolutionEffectObject.cs` and its tier subclasses).

   The reference client tiers the cut-in by how the digivolution happened — a
   plain evolution holds 1.45 s, a DigiXros 2.0 s with a shake, DNA 1.65 s with
   the two merged sources flanking the result, and a Burst evolution 2.7 s. Every
   tier is reachable now that the server names the mechanic on the event
   (`digivolved.mechanic`, and `cardPlayed.mechanic` for the two mechanics the
   engine models as plays). Nothing here re-derives the mechanic from card data:
   a card's printed DigiXros requirement says it CAN be Xros'd, not that this
   play WAS one.

   Blast maps to the base tier with its own wording rather than a tier of its
   own — the reference client gives it the generic clip and swaps only the text.

   Pure: this module decides which event earns a cut-in and in which tier, not
   when one is on screen. */

import type { DigivolveMechanic, Seat, ServerEvent } from "@aegis/shared";
import { getCardDefinition } from "@aegis/shared";
import { colorKey, type ColorName } from "../design/theme";
import type { TranslationKey } from "../i18n";

/** The tiers the reference client cuts, each with its own duration and staging. */
export type CutInTier = "base" | "digiXros" | "dna" | "burst";

export interface DigivolutionCutIn {
  key: number;
  cardId: string;
  artId?: string;
  seat: Seat;
  tier: CutInTier;
  /** The word across the band, which Blast changes without changing the tier. */
  label: TranslationKey;
  /** The card's own colour, which the band behind it is keyed to. */
  color: ColorName;
  /** The two cards that merged, flanking the result. DNA only (`JogressEffectObject.cs:24`). */
  sourceCardIds?: string[];
  sourceArtIds?: string[];
}

/**
 * Only level 6 Digimon earn the full-screen cut-in. Level 7 evolutions and
 * cards without a Digimon level (Options/Tamers) stay out of this presentation.
 */
export const CUT_IN_LEVEL = 6;

/** The printed bracket that makes a played Digimon worth announcing as well. */
const ON_PLAY_CLAUSE = /\[On Play\]/;

/**
 * The tier a mechanic cuts in at. Burst, DNA and DigiXros each have their own clip;
 * every other mechanic — including Blast, which only changes the wording — takes the
 * generic one.
 */
function tierFor(mechanic: DigivolveMechanic): CutInTier {
  switch (mechanic) {
    case "digiXros":
      return "digiXros";
    case "dna":
      return "dna";
    case "burst":
      return "burst";
    default:
      return "base";
  }
}

/** The word the band carries. Only Blast and Burst rename it. */
function labelFor(mechanic: DigivolveMechanic): TranslationKey {
  switch (mechanic) {
    case "blast":
      return "game.cutInWordBlast";
    case "burst":
      return "game.cutInWordBurst";
    default:
      return "game.cutInWord";
  }
}

/**
 * The cut-in an event earns, or null when it earns none.
 *
 * A level 6 digivolution earns one. A *play* of a level 6 card
 * earns one only when the card prints an [On Play] clause, or when the play was
 * itself a digivolution mechanic (DNA / DigiXros): an ordinary hard-played Mega is
 * a card landing on the board, while one that fires on arrival — or one that
 * consumed the board to get there — is the beat the reference client punctuates.
 * Both seats are announced: a cut-in is how the opponent's big turn reads.
 */
export function cutInFromEvent(event: ServerEvent, key: number, enabled: boolean): DigivolutionCutIn | null {
  if (!enabled) return null;
  if (event.kind !== "digivolved" && event.kind !== "cardPlayed") return null;
  const definition = getCardDefinition(event.cardId);
  if (!definition) return null;
  if (definition.level !== CUT_IN_LEVEL) return null;
  const mechanic: DigivolveMechanic = event.mechanic ?? "normal";
  if (event.kind === "cardPlayed") {
    if (!event.permanentId) return null;
    if (event.mechanic === undefined && !ON_PLAY_CLAUSE.test(definition.effectText ?? "")) return null;
  }
  const sourceCardIds = event.kind === "cardPlayed" ? event.sourceCardIds : undefined;
  return {
    key,
    cardId: event.cardId,
    ...(event.artId ? { artId: event.artId } : {}),
    seat: event.seat,
    tier: tierFor(mechanic),
    label: labelFor(mechanic),
    color: colorKey(definition.colors[0]),
    ...(event.kind === "cardPlayed" && event.sourceArtIds ? { sourceArtIds: event.sourceArtIds } : {}),
    ...(sourceCardIds && sourceCardIds.length > 0 ? { sourceCardIds } : {}),
  };
}
