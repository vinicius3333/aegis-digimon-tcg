/* The centre-stage security check the reference client plays: the attacking Digimon
   faces the card that was just revealed, their DP is compared, and the outcome
   resolves between them. Decoration only — it never takes pointer input, and the
   contents and the timeline come from ./securityClash. */

import { getCardDefinition } from "@aegis/shared";
import { CardFull } from "../design/cards";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import {
  orderSecurityClashFighters,
  type SecurityBranchScene,
  type SecurityBreakScene,
  type SecurityClashFighter,
  type SecurityClashScene,
} from "./securityClash";

const CLASH_CARD_WIDTH = 116;

const BRANCH_CARD_WIDTH = 122;

const RESOLUTION_LABEL_KEYS = {
  battle: "overlay.securityBattle",
  effect: "overlay.securityEffect",
  trashed: "overlay.securityTrashed",
} as const;

function ClashCard({ fighter, role }: { fighter: SecurityClashFighter; role: "attacker" | "revealed" }) {
  const { t } = useTranslation();
  const cardName = getCardDefinition(fighter.cardId)?.nameEn ?? fighter.cardId;
  return (
    <figure className="battle-clash__card" data-role={role} data-side={fighter.side}>
      <div className="battle-clash__art">
        <CardFull cardId={fighter.cardId} width={CLASH_CARD_WIDTH} />
      </div>
      <figcaption className="battle-clash__caption">
        <span className="battle-clash__role">
          {role === "attacker" ? t("overlay.isAttacking", { name: cardName }) : t("overlay.revealedFromSecurity")}
        </span>
        <strong className="battle-clash__name">{cardName}</strong>
        {fighter.dp === undefined ? null : <span className="battle-clash__dp">{fighter.dp.toLocaleString()} DP</span>}
      </figcaption>
    </figure>
  );
}

export function SecurityClash({ scene }: { scene: SecurityClashScene }) {
  const { t } = useTranslation();
  const fighters = orderSecurityClashFighters(scene);
  return (
    <div
      className="battle-clash"
      data-testid="security-clash"
      data-resolution={scene.resolution}
      role="status"
      aria-live="assertive"
    >
      <p className="battle-clash__badge">
        <Icons.Shield size={13} />
        {t("overlay.securityCheck")}
      </p>
      <div className="battle-clash__stage">
        <ClashCard fighter={fighters[0]!.fighter} role={fighters[0]!.role} />
        {fighters.length > 1 ? (
          <span className="battle-clash__mark" aria-hidden="true">
            VS
            {scene.resolution === "battle" ? <i className="battle-clash__flash" /> : null}
          </span>
        ) : null}
        {fighters[1] ? <ClashCard fighter={fighters[1].fighter} role={fighters[1].role} /> : null}
      </div>
      <p className="battle-clash__outcome">{t(RESOLUTION_LABEL_KEYS[scene.resolution])}</p>
    </div>
  );
}

/**
 * The light that washes in from the defending player's edge of the board while their
 * shield breaks. Pure decoration: it says whose security is being spent without the
 * viewer having to find the shield badge.
 */
export function SecurityEdgeFlash({ scene }: { scene: SecurityBreakScene }) {
  return (
    <div
      className={`battle-edge-flash battle-edge-flash--${scene.side}`}
      data-testid="security-edge-flash"
      data-side={scene.side}
      aria-hidden="true"
    />
  );
}

/**
 * A revealed security card that resolves an effect, held on the half of the screen the
 * side panels do not occupy while its effect notice reads next to it (the notice is
 * mirrored to the same half by `noticeAnchor`, so the two are one moment).
 */
export function SecurityBranch({ scene }: { scene: SecurityBranchScene }) {
  const { t } = useTranslation();
  const cardName = getCardDefinition(scene.cardId)?.nameEn ?? scene.cardId;
  return (
    <div className="battle-security-branch" data-testid="security-branch" data-side={scene.side} role="status">
      <figure className="battle-security-branch__frame">
        <CardFull cardId={scene.cardId} width={BRANCH_CARD_WIDTH} />
        <figcaption className="battle-security-branch__caption">
          {t("overlay.securityResolving")}
          <br />
          {cardName}
        </figcaption>
      </figure>
    </div>
  );
}
