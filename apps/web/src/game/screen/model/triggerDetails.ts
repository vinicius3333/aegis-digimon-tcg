/* One line per queued trigger, for the dialog that asks which order they resolve in.

   Positions count inside the owner's own battle area: numbering across both players'
   fields printed "Field: 3" for the first Digimon a player had out. One permanent can
   queue an [On Play] and a [When Digivolving] at once, so each row reads its own clause
   rather than the decision's. */

import { getCardDefinition, parseTriggerKey, type DecisionRequest, type PlayerState } from "@aegis/shared";
import { triggerCardId } from "../../boardModel";
import { fieldSlots, triggerClauseSummary, triggerSource, type TriggerSource } from "../../decisionPresentation";
import { playerFacingEffectClause, type TriggerDetail } from "../../overlay";
import type { Translate } from "../../../i18n";

export function triggerDetailsFor({
  decision,
  viewer,
  opponent,
  handInstanceIds,
  t,
}: {
  decision: DecisionRequest | undefined;
  viewer: PlayerState;
  opponent: PlayerState;
  handInstanceIds: string[];
  t: Translate;
}): TriggerDetail[] {
  if (decision?.kind !== "orderTriggers") return [];
  return (decision.options?.triggerKeys ?? []).map((key, index) => {
    const instanceId = parseTriggerKey(key).instanceId;
    const source = ((): TriggerSource => {
      const mine = triggerSource(instanceId, { fieldSlots: fieldSlots(viewer.battleArea), handInstanceIds });
      if (mine.zone !== "unknown") return mine;
      return triggerSource(instanceId, { fieldSlots: fieldSlots(opponent.battleArea), handInstanceIds });
    })();
    const cardId = decision.options?.triggerCardIds?.[index] ?? triggerCardId(key);
    const clause =
      playerFacingEffectClause({
        cardId,
        timing: decision.options?.triggerTimings?.[index] || decision.options?.timing,
        description: decision.options?.triggerDescriptions?.[index],
        isInherited: decision.options?.triggerIsInherited?.[index] === true,
      }) ?? getCardDefinition(cardId)?.effectText;
    return {
      sourceLabel:
        source.zone === "field"
          ? t("overlay.triggerSourceField", { position: source.position })
          : source.zone === "hand"
            ? t("overlay.triggerSourceHand")
            : undefined,
      summary: triggerClauseSummary(clause),
    };
  });
}
