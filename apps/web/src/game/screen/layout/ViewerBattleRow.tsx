/* The viewer's half of the battle area.

   The whole row is a drop area: a card released anywhere in it is played. A permanent
   marks itself a candidate when the held or selected card would digivolve onto it, or
   when an armed link declaration names it. A permanent that can attack is dragged
   rather than tapped, so it keeps a keyboard path of its own. */

import type { Permanent } from "@aegis/shared";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "../../../i18n";
import { BattleRow } from "../../BattleRow";
import { PermanentView, type DropAttrs } from "../../piece";

import type { DropTarget } from "../../dragIntents";
import type { PermanentChrome } from "../types";

export function ViewerBattleRow({
  permanents,
  chrome,
  dragIsPlay,
  selectedAttackerPermanentId,
  isBasePermanent,
  draggable,
  dropIntentAttrs,
  baseDropIntentAttrs,
  onPermanentClick,
  onPermanentPointerDown,
}: {
  permanents: readonly Permanent[];
  chrome: PermanentChrome;
  /** A card is in the air over the board, which lights the row as a drop area. */
  dragIsPlay: boolean;
  selectedAttackerPermanentId: string | null;
  /** The held or selected card would digivolve onto this permanent. */
  isBasePermanent: (perm: Permanent) => boolean;
  /** This permanent answers a drag rather than a tap. */
  draggable: (perm: Permanent) => boolean;
  dropIntentAttrs: (target: DropTarget, id?: string) => DropAttrs;
  baseDropIntentAttrs: (permanentId: string) => DropAttrs;
  onPermanentClick: (perm: Permanent) => (() => void) | undefined;
  onPermanentPointerDown: (perm: Permanent, event: ReactPointerEvent) => void;
}) {
  const { t } = useTranslation();
  return (
    <BattleRow
      data-drop="battle-you"
      {...dropIntentAttrs("battle-you")}
      className="game-battle-row game-battle-row--you"
      role="group"
      aria-label={t("game.yourBattleArea")}
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
        borderRadius: 14,
        transition: "background 150ms, box-shadow 150ms",
        background: dragIsPlay ? "var(--ds-primary-light)" : "transparent",
        boxShadow: dragIsPlay ? "inset 0 0 0 2px var(--ds-primary)" : "none",
      }}
    >
      {permanents.length === 0 ? (
        <span
          style={{
            fontSize: 12,
            color: dragIsPlay ? "var(--ds-primary)" : "var(--ds-foreground-disabled)",
            fontFamily: "var(--ds-font-mono)",
          }}
        >
          {dragIsPlay ? t("game.dropToPlay") : t("game.noDigimon")}
        </span>
      ) : null}
      {permanents.map((p, index) => {
        const canDrag = draggable(p);
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
            candidate={isBasePermanent(p)}
            effectSource={chrome.effectSourcePermanentIds.has(p.permanentId)}
            effectLinked={chrome.effectLinkedPermanentIds.has(p.permanentId)}
            // A board-mode optional prompt points at the permanent whose
            // effect is asking, so the rail and the field read as one.
            highlight={
              selectedAttackerPermanentId === p.permanentId || chrome.decisionHighlightPermanentId === p.permanentId
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
            drop={{
              "data-drop": "perm-you",
              "data-id": p.permanentId,
              ...baseDropIntentAttrs(p.permanentId),
            }}
            onClick={canDrag ? undefined : onPermanentClick(p)}
            onPointerDown={canDrag ? (event) => onPermanentPointerDown(p, event) : undefined}
            // Drag-only permanents still need a pointer-free path: Enter or
            // Space selects them like a tap would.
            onKeyboardActivate={canDrag ? onPermanentClick(p) : undefined}
          />
        );
      })}
    </BattleRow>
  );
}
