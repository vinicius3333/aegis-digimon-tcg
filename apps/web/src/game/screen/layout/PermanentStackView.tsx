/* The whole stack under one permanent, opened from the card itself or from its menu.
   The detail is read off the presented permanent, so what it prints matches the card
   the board is showing rather than a state the narration has not reached. */

import { getCardDefinition, type Permanent } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { StackViewerOverlay } from "../../overlay";
import { canAttackWith, canVortexAttackWith } from "../../boardModel";
import { buildPermanentDetail } from "../../permanentDetail";
import type { PendingFateBadge } from "../../pendingFate";
import { Side } from "../../side";

export function PermanentStackView({
  permanent,
  presentedPermanent,
  mine,
  side,
  container,
  returnFocusTo,
  keywordLabels,
  cards,
  fate,
  onAttack,
  onVortex,
  onClose,
}: {
  permanent: Permanent;
  /** The same permanent as the narration has it, which is what the detail reads. */
  presentedPermanent: Permanent;
  mine: boolean;
  side: Side;
  container: HTMLElement | null;
  returnFocusTo: HTMLElement | null | undefined;
  keywordLabels?: Readonly<Record<string, string>>;
  cards: Parameters<typeof StackViewerOverlay>[0]["cards"];
  fate: PendingFateBadge | undefined;
  onAttack: () => void;
  onVortex: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <StackViewerOverlay
      arenaInspection={{ side, container, returnFocusTo }}
      title={getCardDefinition(permanent.topCard?.cardId ?? "")?.nameEn ?? t("game.stack")}
      cards={cards}
      detail={buildPermanentDetail(presentedPermanent, keywordLabels)}
      fate={fate}
      canAttack={mine && canAttackWith(permanent)}
      canVortex={mine && canVortexAttackWith(permanent)}
      onAttack={onAttack}
      onVortex={onVortex}
      onClose={onClose}
    />
  );
}
