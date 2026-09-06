import { CardKind, type CardDefinition, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { definitionOf } from "../cards/cardData.js";
import { blastDnaMaterialNames } from "../cards/blastDnaMaterials.js";
import { hasBlastDnaDigivolveKeyword } from "../effects/interpreter/registration/keywords.js";

export interface BlastDnaChoice {
  instanceId: string;
  effectKey: string;
  description: string;
  materialPermanentId: string;
  handMaterialInstanceId: string;
  extraMaterialsOnBottom: boolean;
}

/** CR 16-31: one field Digimon and one hand card; CR 8-2-2-2: printed left material on top. */
export function blastDnaChoices(
  state: GameState,
  seat: Seat,
  deps: {
    names(permanent: Permanent, definition: CardDefinition): readonly string[];
    restricted(permanent: Permanent, result: CardDefinition): boolean;
  },
): BlastDnaChoice[] {
  const player = state.players[seat];
  if (player === undefined) return [];
  const choices: BlastDnaChoice[] = [];
  for (const result of player.hand) {
    if (!hasBlastDnaDigivolveKeyword(result.cardId)) continue;
    const required = blastDnaMaterialNames(result.cardId);
    if (required?.length !== 2) continue;
    const resultDefinition = definitionOf(result.cardId);
    for (const field of player.battleArea) {
      if (field.controllerSeat !== seat || field.inBreeding || field.topCard === undefined) continue;
      const fieldDefinition = definitionOf(field.topCard.cardId);
      if (!fieldDefinition.kinds.includes(CardKind.Digimon) || deps.restricted(field, resultDefinition)) continue;
      const fieldNames = deps.names(field, fieldDefinition).map((name) => name.toLowerCase());
      for (const hand of player.hand) {
        if (hand.instanceId === result.instanceId) continue;
        const handDefinition = definitionOf(hand.cardId);
        if (!handDefinition.kinds.includes(CardKind.Digimon)) continue;
        // Battle-area name treatment never changes a card in hand.
        const handName = handDefinition.nameEn.toLowerCase();
        for (const fieldSlot of [0, 1] as const) {
          if (!fieldNames.includes(required[fieldSlot]!.toLowerCase())) continue;
          if (handName !== required[1 - fieldSlot]!.toLowerCase()) continue;
          choices.push({
            instanceId: result.instanceId,
            // Bind the top identity as well as the permanent, so a stale choice cannot evolve a changed host.
            effectKey: `blast-dna-digivolve:${JSON.stringify([field.permanentId, field.topCard.instanceId, hand.instanceId, fieldSlot])}`,
            description: `＜Blast DNA Digivolve＞ ${fieldDefinition.nameEn} + ${handDefinition.nameEn} (hand)`,
            materialPermanentId: field.permanentId,
            handMaterialInstanceId: hand.instanceId,
            extraMaterialsOnBottom: fieldSlot === 0,
          });
        }
      }
    }
  }
  return choices;
}
