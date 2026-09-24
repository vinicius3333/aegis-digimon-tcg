import { getCardDefinition, type Permanent } from "@aegis/shared";
import { CardMini } from "../../design/cards";
import { Icons } from "../../design/icons";
import { useTranslation } from "../../i18n";
import { linkCardOverhang } from "../boardModel";
import { CardBurst } from "../CardBurst";
import { hasBlocker, restrictionBadges, sourceCountBadge } from "../fieldBadges";
import type { PendingFateBadge } from "../pendingFate";
import type { DpPulse } from "../dpPulse";
import type { FreezePulse } from "../freezePulse";
import type { PermanentBurst } from "../showcases";
import { ClawSlash } from "./ClawSlash";
import { DpPulseParticles } from "./DpPulseParticles";
import { permanentAriaLabel } from "./permanentAccessibility";
import { permanentClassName } from "./permanentClassName";
import { resolvePermanentKeywords } from "./permanentKeywords";
import { PermanentBlockerBadge } from "./PermanentBlockerBadge";
import { PermanentCardStack } from "./PermanentCardStack";
import { PermanentEffectSourceParticles } from "./PermanentEffectSourceParticles";
import { PermanentFateBadge } from "./PermanentFateBadge";
import { PermanentKeywordBadges } from "./PermanentKeywordBadges";
import { PermanentLinkedCards } from "./PermanentLinkedCards";
import { PermanentRestrictionBadges } from "./PermanentRestrictionBadges";
import { PermanentSourceBadge } from "./PermanentSourceBadge";
import { PermanentSparkles } from "./PermanentSparkles";
import { PermanentSummoningRing } from "./PermanentSummoningRing";
import { PermanentTransformToken } from "./PermanentTransformToken";
import { permanentTransformation } from "../transformation";
import type { DropAttrs } from "./types";

export function PermanentView({
  perm,
  keywordLabels,
  highlight,
  candidate,
  dimmed,
  compact,
  lunge,
  burst,
  pending,
  fate,
  shake,
  claw,
  dpPulse,
  dpBadgeSuppressed = false,
  freezePulse,
  effectSource,
  effectLinked,
  suspendDelayMs,
  heldSuspended = false,
  width,
  refCb,
  onClick,
  drop,
  onPointerDown,
  onKeyboardActivate,
  onInspect,
}: {
  perm: Permanent;
  keywordLabels?: Readonly<Record<string, string>>;
  highlight?: boolean;
  candidate?: boolean;
  dimmed?: boolean;
  compact?: boolean;
  /** Play the attack lunge, leaning toward the security stack in this direction. */
  lunge?: "up" | "down";
  /** What an effect currently resolving is about to do to this permanent (server-projected). */
  fate?: PendingFateBadge;
  /** Shake the card: a refused action, or a battle it just lost. */
  shake?: boolean;
  /** Sweep the claw across the card, on the losing side of a battle. */
  claw?: boolean;
  /** The DP change this permanent is currently pulsing over. */
  dpPulse?: DpPulse;
  dpBadgeSuppressed?: boolean;
  /** The attack/block lock that just landed on this permanent, which jolts the card. */
  freezePulse?: FreezePulse;
  /** This permanent's own effect is activating: it glows and throws a small particle. */
  effectSource?: boolean;
  /**
   * The clause this permanent raised is on screen. The activation punch is over; what is
   * left is a steady light saying "this card is the one that toast is about", so the two
   * are read as one moment rather than as a flash and, later, a sentence somewhere else.
   */
  effectLinked?: boolean;
  /** The colour-keyed burst this permanent is playing, behind the card. */
  burst?: PermanentBurst;
  /** Held back while the card is still being announced centre-screen. */
  pending?: boolean;
  /** Staggers the suspend rotation so an unsuspend phase sweeps across the board. */
  suspendDelayMs?: number;
  /** Visual pre-unsuspend hold; legality still comes from the live permanent. */
  heldSuspended?: boolean;
  /** Explicit card width; overrides the `compact` default. */
  width?: number;
  refCb?: (el: HTMLDivElement | null) => void;
  onClick?: () => void;
  drop?: DropAttrs;
  onPointerDown?: (e: React.PointerEvent) => void;
  /** Keyboard fallback for drag-only interactions (select to play or attack). */
  onKeyboardActivate?: () => void;
  /** Secondary action used while the permanent's primary click answers a field selection. */
  onInspect?: () => void;
}) {
  const permanentWidth = width ?? (compact ? 76 : 116);
  const isVisuallySuspended = heldSuspended || perm.isSuspended;
  const suspendedInlineMargin = Math.ceil(permanentWidth * 0.2);
  const { t } = useTranslation();
  const topId = perm.topCard?.cardId;
  if (!topId) return null;
  const def = getCardDefinition(topId);
  const delta = perm.currentDP - perm.baseDP;
  const hasDpDelta = delta !== 0;
  const activeKeywords = resolvePermanentKeywords({ perm, keywordLabels });
  // Server truth (`Permanent.keywords`): the resolved keyword list already folds a
  // ＜Blocker＞ this Digimon only has because something granted it, so the shield is
  // never read off the printed art.
  const blocker = hasBlocker(perm);
  const sources = sourceCountBadge(perm);
  // Server truth as well (`Permanent.cannotAttack` and friends): the standing debuffs
  // an effect has imposed, worn for as long as they hold rather than only jolting the
  // card once when they land.
  const restrictions = restrictionBadges(perm);
  // Server truth as well (`Permanent.originalNameOverride` / `originalColorsOverride`): what
  // this position currently COUNTS AS after an effect rewrote its original card information.
  const transformation = permanentTransformation(perm);

  const cardName = def?.nameEn ?? topId;
  const activate = onKeyboardActivate ?? onClick;
  const interactive = !!activate || !!onPointerDown;
  return (
    <div
      ref={refCb}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onKeyDown={
        activate
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              activate();
            }
          : undefined
      }
      // Non-interactive permanents stay unlabeled: the card art inside already
      // exposes the card name, and a second name on the wrapper reads twice.
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={
        interactive
          ? permanentAriaLabel({ perm, heldSuspended, restrictions, fate, cardName, delta, hasDpDelta, t })
          : undefined
      }
      className={permanentClassName({
        lunge,
        shake,
        freezePulse,
        effectSource,
        effectLinked,
        candidate,
        threatened: fate?.fate === "effectTarget",
      })}
      {...(drop ?? {})}
      data-suspended={isVisuallySuspended || undefined}
      style={{
        position: "relative",
        cursor: interactive ? "pointer" : "default",
        touchAction: "none",
        opacity: dimmed ? 0.4 : 1,
        // The reference client hides the destination until the centre-screen
        // announcement is over, rather than flying the card across the board.
        visibility: pending ? "hidden" : undefined,
        transform: highlight || effectSource || effectLinked ? "translateY(-6px)" : "none",
        marginInlineStart: isVisuallySuspended ? suspendedInlineMargin : 0,
        marginInlineEnd:
          (isVisuallySuspended ? suspendedInlineMargin : 0) + linkCardOverhang(perm.linked.length, permanentWidth),
        transition: "transform 160ms, opacity 160ms, margin-inline-start 200ms, margin-inline-end 200ms",
      }}
    >
      <PermanentCardStack stack={perm.stack} width={permanentWidth} />
      <PermanentLinkedCards linked={perm.linked} width={permanentWidth} />
      {/* Re-keying on the entry signature remounts the wrapper, which is what
          restarts the CSS entrance: the card sparkles when it reaches the board
          and again on every digivolution. `pending` is part of the signature
          because the permanent mounts while it is still hidden behind the
          centre-screen showcase — without it the entrance ran out its whole
          duration under `visibility: hidden` and the card simply appeared. */}
      <div
        key={`${perm.permanentId}:${perm.stack.length}:${pending ? "held" : "shown"}`}
        className={`game-card-enter${burst ? " game-card-landing" : ""}`}
        style={{ position: "relative", zIndex: 1 }}
      >
        {burst ? <CardBurst key={burst.key} variant={burst.variant} color={burst.color} /> : null}
        {/* The reference client drops a landing card onto an OutBounce and kicks up
            dust where it hits; the dust is what sells the drop as weight. */}
        {burst ? <span key={`dust-${burst.key}`} className="game-card-dust" aria-hidden="true" /> : null}
        {effectSource ? <PermanentEffectSourceParticles /> : null}
        <CardMini
          cardId={topId}
          artId={perm.topCard?.artId}
          width={permanentWidth}
          suspended={isVisuallySuspended}
          suspendDelayMs={suspendDelayMs}
          selected={highlight}
          attackable={candidate}
          dp={perm.currentDP}
          info
          zoomOnHover={false}
        />
        <PermanentSparkles />
        {perm.summoningSick ? <PermanentSummoningRing /> : null}
        {/* The claw the reference client sweeps over a permanent that lost its
            battle, a beat before the shatter. Purely decorative, so it sits above
            the art and takes no pointer events. */}
        {claw ? <ClawSlash key={`claw-${perm.permanentId}`} /> : null}
        {dpPulse ? <DpPulseParticles key={dpPulse.key} pulse={dpPulse} /> : null}
      </div>
      {sources ? <PermanentSourceBadge sources={sources} /> : null}
      {blocker ? <PermanentBlockerBadge /> : null}
      {fate ? <PermanentFateBadge fate={fate} /> : null}
      {activeKeywords.length > 0 ? <PermanentKeywordBadges keywords={activeKeywords} width={permanentWidth} /> : null}
      {restrictions.length > 0 || (hasDpDelta && !dpBadgeSuppressed) ? (
        <PermanentRestrictionBadges
          restrictions={restrictions}
          dpDelta={hasDpDelta && !dpBadgeSuppressed ? delta : undefined}
        />
      ) : null}
      {transformation ? (
        <PermanentTransformToken
          transformation={transformation}
          width={permanentWidth}
          suspended={isVisuallySuspended}
        />
      ) : null}
      {onInspect ? (
        <button
          type="button"
          className="game-permanent__inspect"
          aria-label={t("game.inspectCard", { card: cardName })}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onInspect();
          }}
        >
          <Icons.Search size={14} />
        </button>
      ) : null}
    </div>
  );
}
