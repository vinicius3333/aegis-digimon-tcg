/* The centre-stage security check the reference client plays: the attacking Digimon
   faces the card that was just revealed, their DP is compared, and the outcome
   resolves between them. Decoration only — it never takes pointer input, and the
   contents and the timeline come from ./securityClash. */

import type { CSSProperties } from "react";
import { getCardDefinition } from "@aegis/shared";
import { CardFull } from "../design/cards";
import { colorKey, type ColorName } from "../design/theme";
import { Icons } from "../design/icons";
import { ClawSlash } from "./boardPieces";
import { CardCracks, CardShatter } from "./CardShatterView";
import { useTranslation } from "../i18n";
import {
  orderSecurityClashFighters,
  type SecurityBranchScene,
  type SecurityBreakScene,
  type SecurityClashFighter,
  type SecurityClashScene,
} from "./securityClash";

/* The narrow blocks in game.css override both widths, so these are the pointer sizes. */
const CLASH_CARD_WIDTH = 158;

/* A destroyed card stands alone with nothing printed around it, so it takes the room a
   check splits between two cards and their captions. */
const DESTROYED_CARD_WIDTH = 236;

const BRANCH_CARD_WIDTH = 150;

const RESOLUTION_LABEL_KEYS = {
  // The check is still resolving on the server, so the scene says what it knows: this card
  // was revealed, and what it does is happening now.
  pending: "overlay.securityResolving",
  battle: "overlay.securityBattle",
  effect: "overlay.securityEffect",
  trashed: "overlay.securityTrashed",
} as const;

/* A card an effect trashed never had a chance to do anything, so nothing a check's scene
   prints applies: it was not checked, and "no effect" would read as a verdict on a card
   that was never given one. The scene is the card alone — revealed, cracked and broken,
   the way the reference client's `DestroySecurityEffect` plays it — and the one line it
   still owes is the accessible name of what happened. */
const DESTRUCTION_ROLE_KEY = "overlay.trashedFromSecurity";

/** The battle verdict for one of the two cards. */
type ClashFate = "none" | "beaten" | "stands";

function ClashCard({
  fighter,
  role,
  fate,
  spent,
  destroyed,
  width,
}: {
  fighter: SecurityClashFighter;
  role: "attacker" | "revealed";
  width: number;
  /** `beaten` takes the claw, the shake and the dim; `stands` is emphasized. */
  fate: ClashFate;
  /** This card leaves the board after the beat, whatever the verdict was. */
  spent: boolean;
  /** An effect took this card out of the stack rather than a check flipping it. */
  destroyed: boolean;
}) {
  const { t } = useTranslation();
  const cardName = getCardDefinition(fighter.cardId)?.nameEn ?? fighter.cardId;
  return (
    <figure
      className="battle-clash__card"
      data-role={role}
      data-side={fighter.side}
      data-fate={fate}
      data-spent={spent ? "true" : undefined}
    >
      <div className="battle-clash__frame">
        <div className="battle-clash__art">
          <CardFull cardId={fighter.cardId} width={width} />
          {/* Inside the art box so the cracks go with the card the moment its shards fly. */}
          {destroyed ? <CardCracks /> : null}
        </div>
        {/* Drawn outside the art box, which clips its own entrance: the shards and
            the claw both reach past the card's edge. */}
        {spent ? (
          <span className="battle-clash__shatter" aria-hidden="true">
            <CardShatter cardId={fighter.cardId} width={width} color={clashShatterColor(fighter.cardId)} />
          </span>
        ) : null}
        {fate === "beaten" ? <ClawSlash /> : null}
      </div>
      {destroyed ? null : (
        <figcaption className="battle-clash__caption">
          <span className="battle-clash__role">
            {role === "attacker" ? t("overlay.isAttacking", { name: cardName }) : t("overlay.revealedFromSecurity")}
          </span>
          <strong className="battle-clash__name">{cardName}</strong>
          {fighter.dp === undefined ? null : <span className="battle-clash__dp">{fighter.dp.toLocaleString()} DP</span>}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * The verdict each card takes, straight from the server's DP compare. Whichever side
 * lost gets the claw, the shake and the dim, and the side that survived is emphasized
 * — both directions, and a tie beats both. No DP is compared here: the figures on the
 * cards are printed values, not the live ones the engine battled with.
 *
 * With no compare published there is no verdict to draw, so neither card is marked.
 */
function clashFate(scene: SecurityClashScene, role: "attacker" | "revealed"): ClashFate {
  if (scene.resolution !== "battle" || scene.loser === undefined) return "none";
  const lost = role === "attacker" ? scene.loser.attacker : scene.loser.revealed;
  return lost ? "beaten" : "stands";
}

/**
 * Whether the card leaves the board after the beat. The checked card does whenever the
 * check ends with it in the trash — CR 13-1-8-4 trashes it whichever way a compare went,
 * and a card with nothing to resolve is trashed outright — while the attacker is a
 * permanent whose own deletion is narrated by the board, not by this scene. A card that
 * resolves an effect is excluded: it detours through the branch scene, which plays its
 * own exit.
 */
function clashSpent(scene: SecurityClashScene, role: "attacker" | "revealed"): boolean {
  return role === "revealed" && (scene.resolution === "battle" || scene.resolution === "trashed");
}

/** The revealed card breaks in its own colour, the way a deleted permanent does. */
function clashShatterColor(cardId: string): ColorName {
  return colorKey(getCardDefinition(cardId)?.colors[0]);
}

function revealedName(scene: SecurityClashScene): string {
  return getCardDefinition(scene.revealed.cardId)?.nameEn ?? scene.revealed.cardId;
}

export function SecurityClash({ scene }: { scene: SecurityClashScene }) {
  const { t } = useTranslation();
  const fighters = orderSecurityClashFighters(scene);
  const destroyed = scene.cause === "destruction";
  const cardWidth = destroyed ? DESTROYED_CARD_WIDTH : CLASH_CARD_WIDTH;
  return (
    <div
      className="battle-clash"
      data-testid="security-clash"
      data-resolution={scene.resolution}
      data-cause={scene.cause ?? "check"}
      data-departing={scene.departing ? "true" : undefined}
      // A scene that names its own outcome beat runs the break and the fade behind it from
      // that moment: zero for a check that held on stage while it resolved and has already
      // spent the lead-in, and the shorter destruction beat for a card no attacker faced.
      style={
        scene.outcomeAtMs === undefined
          ? undefined
          : ({ "--t-clash-outcome-at": `${scene.outcomeAtMs}ms` } as CSSProperties)
      }
      role="status"
      aria-live="assertive"
      aria-label={destroyed ? `${t(DESTRUCTION_ROLE_KEY)}: ${revealedName(scene)}` : undefined}
    >
      {destroyed ? null : (
        <p className="battle-clash__badge">
          <Icons.Shield size={13} />
          {t("overlay.securityCheck")}
        </p>
      )}
      <div className="battle-clash__stage">
        <ClashCard
          fighter={fighters[0]!.fighter}
          role={fighters[0]!.role}
          fate={clashFate(scene, fighters[0]!.role)}
          spent={clashSpent(scene, fighters[0]!.role)}
          destroyed={destroyed}
          width={cardWidth}
        />
        {fighters.length > 1 ? (
          <span className="battle-clash__mark" aria-hidden="true">
            VS
            {scene.resolution === "battle" ? <i className="battle-clash__flash" /> : null}
          </span>
        ) : null}
        {fighters[1] ? (
          <ClashCard
            fighter={fighters[1].fighter}
            role={fighters[1].role}
            fate={clashFate(scene, fighters[1].role)}
            spent={clashSpent(scene, fighters[1].role)}
            destroyed={destroyed}
            width={cardWidth}
          />
        ) : null}
      </div>
      {destroyed ? null : <p className="battle-clash__outcome">{t(RESOLUTION_LABEL_KEYS[scene.resolution])}</p>}
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
    <div
      className="battle-security-branch"
      data-testid="security-branch"
      data-side={scene.side}
      // The dock is open-ended, so its slide-in and its exit are two animations rather
      // than one fixed clip: the state says which of them the card is playing.
      data-state={scene.state}
      role="status"
    >
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
