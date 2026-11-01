/* One line per queued trigger, for the dialog that asks which order they resolve in.

   Positions count inside the owner's own battle area: numbering across both players'
   fields printed "Field: 3" for the first Digimon a player had out. One permanent can
   queue an [On Play] and a [When Digivolving] at once, so each row reads its own clause
   rather than the decision's. */

import { getCardDefinition, parseTriggerKey, type DecisionRequest, type PlayerState } from "@aegis/shared";
import { Zone } from "@aegis/shared/schema/enums";
import { triggerCardId } from "../../boardModel";
import { triggerClauseSummary } from "../../decisionPresentation";
import { playerFacingEffectClause, type TriggerDetail } from "../../overlay";
import type { Translate } from "../../../i18n";
import { findTriggerSource, type TriggerSource } from "@/game/screen/model/findTriggerSource";

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
  handInstanceIds: readonly string[];
  t: Translate;
}): TriggerDetail[] {
  if (decision?.kind !== "orderTriggers") return [];
  return (decision.options?.triggerKeys ?? []).map((key, index) => {
    const source = findTriggerSource({
      instanceId: parseTriggerKey(key).instanceId,
      players: [viewer, opponent],
      handInstanceIds,
    });
    const cardId = decision.options?.triggerCardIds?.[index] ?? triggerCardId(key);
    const clause =
      playerFacingEffectClause({
        cardId,
        timing: decision.options?.triggerTimings?.[index] || decision.options?.timing,
        description: decision.options?.triggerDescriptions?.[index],
        isInherited: decision.options?.triggerIsInherited?.[index] === true,
      }) ?? getCardDefinition(cardId)?.effectText;
    return {
      sourceLabel: getTriggerSourceLabel(source, t),
      summary: triggerClauseSummary(clause),
    };
  });
}

function getTriggerSourceLabel(source: TriggerSource | undefined, t: Translate): string | undefined {
  if (!source) {
    return undefined;
  }
  switch (source.zone) {
    case Zone.BattleArea:
      return t("overlay.triggerSourceField", { position: source.position });
    case Zone.Hand:
      return t("overlay.triggerSourceHand", { position: source.position });
    case Zone.Breeding:
      return t("overlay.triggerSourceBreeding");
    case Zone.Trash:
      return t("overlay.triggerSourceTrash");
    case Zone.Delay:
      return t("overlay.triggerSourceDelay");
    case Zone.Security:
      return t("overlay.triggerSourceSecurity");
  }
}
