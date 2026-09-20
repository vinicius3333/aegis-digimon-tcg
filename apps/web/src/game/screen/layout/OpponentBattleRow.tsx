/* The opponent's half of the battle area.

   A permanent marks itself a candidate when the chosen attacker may hit it. A drag is
   always a normal declaration, so only the tap path can be in ＜Vortex＞ mode. */

import type { Permanent } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { BattleRow, suspendedCardEdgeClearance } from "../../BattleRow";
import { PermanentView, type DropAttrs } from "../../piece";
import { attackTargetIdsOf } from "../../boardModel";
import type { DropTarget } from "../../dragIntents";
import type { PermanentChrome } from "../types";

export function OpponentBattleRow({
  permanents,
  chrome,
  attackerPermanent,
  draggedAttackerPermanent,
  vortexMode,
  dropIntentAttrs,
  isDecisionCandidate,
  onPermanentClick,
  onPermanentInspect,
}: {
  permanents: readonly Permanent[];
  chrome: PermanentChrome;
  /** The attacker chosen by tapping, whose targets light up. */
  attackerPermanent: Permanent | undefined;
  /** The attacker currently held in the air, whose targets light up the same way. */
  draggedAttackerPermanent: Permanent | undefined;
  vortexMode: boolean;
  dropIntentAttrs: (target: DropTarget, id?: string) => DropAttrs;
  isDecisionCandidate: (perm: Permanent) => boolean;
  onPermanentClick: (perm: Permanent) => (() => void) | undefined;
  onPermanentInspect: (perm: Permanent) => void;
}) {
  const { t } = useTranslation();
  return (
    <BattleRow
      className="game-battle-row game-battle-row--opp"
      role="group"
      aria-label={t("game.oppBattleArea")}
      edgeClearance={suspendedCardEdgeClearance(chrome.width)}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        gap: 18,
        justifyContent: "safe center",
        alignItems: "center",
        minHeight: 110,
        // Bottom room for the activate-effect pill, which hangs below its
        // permanent inside a row that clips vertical overflow.
        padding: "12px 18px 26px",
      }}
    >
      {permanents.length === 0 ? (
        <span style={{ fontSize: 12, color: "var(--ds-foreground-disabled)", fontFamily: "var(--ds-font-mono)" }}>
          {t("game.noDigimon")}
        </span>
      ) : null}
      {permanents.map((p, index) => {
        const isCand =
          isDecisionCandidate(p) ||
          attackTargetIdsOf(attackerPermanent, vortexMode).includes(p.permanentId) ||
          attackTargetIdsOf(draggedAttackerPermanent, false).includes(p.permanentId);
        return (
          <PermanentView
            key={p.permanentId}
            perm={p}
            keywordLabels={chrome.keywordLabels?.[p.permanentId]}
            compact={chrome.compact}
            width={chrome.width}
            refCb={(el) => {
              chrome.permanentRefs.current[p.permanentId] = el;
            }}
            drop={{
              "data-drop": "perm-opp",
              "data-id": p.permanentId,
              ...dropIntentAttrs("perm-opp", p.permanentId),
            }}
            candidate={isCand}
            effectSource={chrome.effectSourcePermanentIds.has(p.permanentId)}
            effectLinked={chrome.effectLinkedPermanentIds.has(p.permanentId)}
            highlight={
              chrome.decisionHighlightPermanentId === p.permanentId ||
              chrome.decisionPickedInstanceIds.has(p.permanentId) ||
              chrome.decisionPickedInstanceIds.has(p.topCard.instanceId)
            }
            burst={chrome.permanentBursts.get(p.permanentId)}
            pending={chrome.pendingPermanentIds.has(p.permanentId)}
            fate={chrome.fateBadges.get(p.permanentId)}
            shake={chrome.combatImpactIds.has(p.permanentId)}
            claw={chrome.combatImpactIds.has(p.permanentId)}
            dpPulse={chrome.dpPulses.get(p.permanentId)}
            freezePulse={chrome.freezePulses.get(p.permanentId)}
            lunge={chrome.attackLunge?.permanentId === p.permanentId ? chrome.attackLunge.direction : undefined}
            heldSuspended={chrome.heldSuspendedIds.has(p.permanentId)}
            suspendDelayMs={chrome.suspendDelayMs(index)}
            onClick={onPermanentClick(p)}
            onInspect={isDecisionCandidate(p) ? () => onPermanentInspect(p) : undefined}
          />
        );
      })}
    </BattleRow>
  );
}
