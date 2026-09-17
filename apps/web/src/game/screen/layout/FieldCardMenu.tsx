/* The action menu anchored above a field card: what the card is, and what this seat
   may do with it right now. The opponent's cards open the same menu with no actions,
   which is how a card is read without acting on it. */

import type { Permanent } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { CardActionMenu } from "../../overlay";
import { canAttackWith, canVortexAttackWith, parseActivatable } from "../../boardModel";
import { buildPermanentDetail } from "../../permanentDetail";
import type { PendingFateBadge } from "../../pendingFate";
import { Side } from "../../side";

export function FieldCardMenu({
  permanent,
  presentedPermanent,
  side,
  x,
  y,
  container,
  returnFocusTo,
  keywordLabels,
  fate,
  sheet,
  stackCards,
  mine,
  activatable,
  promotable,
  linkTargets,
  onPromote,
  onActivateEffect,
  onLink,
  onViewStack,
  onAttack,
  onVortex,
  onClose,
}: {
  permanent: Permanent;
  /** The same permanent as the narration has it, which is what the detail reads. */
  presentedPermanent: Permanent;
  side: Side;
  x: number;
  y: number;
  container: HTMLElement | null;
  returnFocusTo: HTMLElement | null | undefined;
  keywordLabels?: Readonly<Record<string, string>>;
  fate: PendingFateBadge | undefined;
  /** A narrow layout answers with a bottom sheet rather than an anchored menu. */
  sheet: boolean;
  stackCards: Parameters<typeof CardActionMenu>[0]["stackCards"];
  mine: boolean;
  /** The card's own effects may be activated: this seat's turn, and its card. */
  activatable: boolean;
  /** A breeding Digimon at level 3 or above, inside its own breeding step. */
  promotable: boolean;
  linkTargets: readonly string[];
  onPromote: () => void;
  onActivateEffect: (instanceId: string, effectKey: string) => void;
  onLink: (instanceId: string, cardId: string, targetPermanentIds: readonly string[]) => void;
  onViewStack: () => void;
  onAttack: () => void;
  onVortex: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <CardActionMenu
      arenaInspection={{ side, container, returnFocusTo }}
      detail={buildPermanentDetail(presentedPermanent, keywordLabels)}
      fate={fate}
      x={x}
      y={y}
      cardId={permanent.topCard?.cardId}
      artId={permanent.topCard?.artId}
      sheet={sheet}
      dp={permanent.currentDP}
      baseDP={permanent.baseDP}
      keywords={[...permanent.keywords]}
      stackCards={stackCards}
      suspended={permanent.isSuspended}
      promote={promotable ? { label: t("game.moveToBattle"), onPromote } : undefined}
      effects={
        activatable
          ? parseActivatable(permanent.activatableEffectsJson).map((entry) => ({
              label: entry.description,
              onActivate: () => onActivateEffect(entry.instanceId, entry.effectKey),
            }))
          : []
      }
      link={
        mine && permanent.topCard && linkTargets.length > 0
          ? { onLink: () => onLink(permanent.topCard!.instanceId, permanent.topCard!.cardId, linkTargets) }
          : undefined
      }
      canAttack={mine && canAttackWith(permanent)}
      canVortex={mine && canVortexAttackWith(permanent)}
      onViewStack={onViewStack}
      onAttack={onAttack}
      onVortex={onVortex}
      onClose={onClose}
    />
  );
}
