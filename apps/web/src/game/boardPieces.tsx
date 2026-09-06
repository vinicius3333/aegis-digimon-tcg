/* Board sub-components — piles, permanents, breeding slot, memory gauge, hand,
   attack arrow. Presentational; they read real Permanent / count data and take
   interaction handlers (click / drop zones / pointer-drag) as props. */

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { getCardDefinition, type Permanent } from "@aegis/shared";
import { COLORS, colorKey } from "../design/theme";
import { CardBack, CardFull, CardMini } from "../design/cards";
import { useEnterAnimation } from "./animations";
import { CardBurst } from "./CardBurst";
import type { PermanentBurst } from "./showcases";
import { linkCardSlots } from "./boardModel";
import {
  memoryArcPath,
  memoryCellCenterFraction,
  memoryPredictionPath,
  shouldDrawMemoryArc,
  shouldDrawMemoryPrediction,
} from "./memoryArc";
import { pressGesture } from "./pressGesture";
import { turnControlLabelKey, type TurnControlState } from "./turnControl";
import { formatKeyword } from "./keywordDisplay";
import { hasBlocker, restrictionBadges, sourceCountBadge } from "./fieldBadges";
import { deckLayerCount } from "./deckChrome";
import type { PendingFateBadge } from "./pendingFate";
import type { DpPulse } from "./dpPulse";
import type { FreezePulse } from "./freezePulse";
import { TIMINGS } from "./timings";
import { useTranslation } from "../i18n";

type DropAttrs = Record<string, string>;

function formatDpDelta(amount: number): string {
  return amount % 1000 === 0 ? `${amount / 1000}K` : amount.toLocaleString();
}

export interface HandEntry {
  instanceId: string;
  cardId: string;
  activatableEffectsJson: string;
  /** Server projection: this card can be played right now. */
  playableFromHand: boolean;
  /** Server projection: memory this play would cost with active reducers applied; -1 if not projected. */
  projectedPlayCost: number;
  /** Server projection: own permanents this card may digivolve onto right now. */
  digivolveTargetPermanentIds: readonly string[];
}

/** How many pieces the security pane breaks into. */
const SHIELD_SHARD_COUNT = 6;

/** How far the middle shard is thrown, in pixels. */
const SHIELD_SHARD_REACH = 34;

/** Deterministic 0..1 from a break's seed and a shard's place in the ring. */
function shardNoise(seed: number, index: number): number {
  const value = Math.sin((seed + 1) * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * How this break throws its shards. The ring keeps every break balanced; the seed — the
 * check's own key — jitters the angle, the reach and the spin, so two checks in a row do
 * not shatter into the same frame (battle-animation-spec.md §4b).
 */
export function shieldShards(seed: number): readonly { x: number; y: number; spin: number }[] {
  return Array.from({ length: SHIELD_SHARD_COUNT }, (_, index) => {
    const noise = shardNoise(seed, index);
    const angle = ((index + 0.5 + (noise - 0.5) * 0.7) / SHIELD_SHARD_COUNT) * Math.PI * 2;
    const reach = SHIELD_SHARD_REACH * (0.62 + noise * 0.6);
    return {
      x: Math.round(Math.cos(angle) * reach),
      y: Math.round(Math.sin(angle) * reach),
      spin: Math.round(75 + noise * 110) * (index % 2 === 0 ? -1 : 1),
    };
  });
}

export function Pile({
  count,
  label,
  className,
  topCardId,
  dim,
  glow,
  compact,
  shield,
  armed,
  breaking,
  shardSeed,
  faceUp,
  attackLabel,
  riffling,
  landing,
  refEl,
  onClick,
  drop,
  useSelectedSleeve = true,
}: {
  count: number;
  label: string;
  className?: string;
  topCardId?: string;
  dim?: boolean;
  glow?: boolean;
  compact?: boolean;
  /** Render as a shield-shaped security counter (red for the viewer, blue for the opponent). */
  shield?: "you" | "opp";
  /** The stack is under attack: the pane pulses before it breaks. */
  armed?: boolean;
  /** The pane is shattering on a security check. */
  breaking?: boolean;
  /** Which break this is, so its shards are thrown differently from the last one's. */
  shardSeed?: number;
  /** The stack holds a card the opponent has already seen. */
  faceUp?: boolean;
  /** What attacking this stack would be, while it is a legal target being aimed at. */
  attackLabel?: string;
  /** The pile is being shuffled: it riffles once. */
  riffling?: boolean;
  /** A card is flying back onto the stack. */
  landing?: boolean;
  refEl?: (el: HTMLDivElement | null) => void;
  onClick?: () => void;
  drop?: DropAttrs;
  useSelectedSleeve?: boolean;
}) {
  const w = compact ? 42 : 62;
  if (shield) {
    const pane = (
      <div
        className={[
          "game-security-shield",
          `game-security-shield--${shield}`,
          glow ? "game-security-shield--glow" : "",
          armed ? "game-security-shield--armed" : "",
          landing ? "game-security-shield--landing" : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        ref={refEl}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onClick();
              }
            : undefined
        }
        role={onClick ? "button" : "img"}
        tabIndex={onClick ? 0 : undefined}
        aria-label={`${label} · ${count}`}
        {...(drop ?? {})}
        style={{ cursor: onClick ? "pointer" : "default", opacity: dim ? 0.5 : 1 }}
      >
        {breaking ? (
          <span className="game-security-shield__burst" aria-hidden>
            <CardBurst variant="shatter" />
          </span>
        ) : null}
        {breaking ? (
          <span className="game-security-shield__shards" aria-hidden>
            {shieldShards(shardSeed ?? 0).map((shard, index) => (
              <i
                key={index}
                style={
                  {
                    "--shard-x": `${shard.x}px`,
                    "--shard-y": `${shard.y}px`,
                    "--shard-spin": `${shard.spin}deg`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        ) : null}
        {faceUp ? (
          <span className="game-security-shield__face-up" aria-hidden>
            ◉
          </span>
        ) : null}
        {/* Re-keyed on the value so the pop restarts every time security moves. */}
        <span key={count} className="game-security-shield__count" aria-hidden>
          {count}
        </span>
        <span className="game-security-shield__label" aria-hidden>
          {label}
        </span>
      </div>
    );
    // The shield is clipped to its own polygon, so the label has to sit outside it.
    if (!attackLabel) return pane;
    return (
      <span className="game-security-shield-wrap">
        {pane}
        <span className="game-security-shield__attack-label" aria-hidden>
          {attackLabel}
        </span>
      </span>
    );
  }
  const layers = deckLayerCount(count);
  return (
    <div
      className={className}
      ref={refEl}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onClick();
            }
          : undefined
      }
      role={onClick ? "button" : "img"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${label} · ${count}`}
      {...(drop ?? {})}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: compact ? 2 : 5,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {/* The pile is as thick as it is deep, and gone entirely once it empties —
          the reference client's own deck-out warning. */}
      <div
        aria-hidden
        className={`game-pile${riffling ? " game-pile--riffling" : ""}`}
        style={{ position: "relative", width: w, height: w * 1.4 }}
      >
        {Array.from({ length: layers }, (_, index) => (
          <div
            key={index}
            className="game-pile__layer"
            style={{
              position: "absolute",
              inset: 0,
              transform: `translate(${(index + 1) * 2.6}px,${(index + 1) * 2.6}px)`,
              borderRadius: 8,
              background: "var(--ds-surface-muted)",
              border: "1px solid var(--ds-border)",
            }}
          />
        ))}
        {layers === 0 ? null : (
          <div
            className="game-pile__top"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: glow ? "0 0 0 3px var(--ds-warning), 0 0 18px rgba(217,154,43,0.55)" : "none",
              transition: "box-shadow 200ms",
              opacity: dim ? 0.5 : 1,
            }}
          >
            {topCardId ? (
              <CardMini cardId={topCardId} width={w} />
            ) : (
              <CardBack width={w} label={count} useSelectedSleeve={useSelectedSleeve} />
            )}
          </div>
        )}
        {topCardId && layers > 0 ? (
          <span
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              background: "var(--ds-foreground)",
              color: "var(--ds-background)",
              fontFamily: "var(--ds-font-mono)",
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: 6,
            }}
          >
            {count}
          </span>
        ) : null}
      </div>
      <span
        style={{
          fontFamily: "var(--ds-font-mono)",
          fontSize: compact ? 8 : 10,
          letterSpacing: "0.05em",
          color: "var(--ds-foreground-muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * The pane that takes the play surfaces' pointer input away while a security check owns
 * the screen. It draws nothing and says nothing: it exists so a click on a card, a stack
 * or the turn control during the check cannot become an action on a board the other
 * player is still watching resolve. The board's own capture-phase listener sits above it,
 * so clicking through the scene still fast-forwards whatever part of it is skippable.
 */
export function BoardInputLock() {
  return <div className="game-input-lock" data-testid="board-input-lock" aria-hidden="true" />;
}

/** The three gashes of the claw, each a little behind the one above it. */
const CLAW_TINE_INDEXES = [0, 1, 2];

/**
 * The claw the reference client rakes across a permanent that lost its battle:
 * three tapered gashes swept corner to corner in a quarter of a second, ahead of
 * the deletion burst. Drawn rather than drop-shadowed so the taper survives at the
 * compact card widths a phone lays the board out at.
 */
export function ClawSlash() {
  return (
    <span className="game-claw" aria-hidden="true">
      <svg viewBox="0 0 100 140" preserveAspectRatio="none" focusable="false">
        {CLAW_TINE_INDEXES.map((index) => (
          <path
            key={index}
            className="game-claw__tine"
            style={{ "--claw-index": index } as CSSProperties}
            d={`M ${-14 + index * 22} ${-6 + index * 4} C ${26 + index * 20} ${34 + index * 6}, ${52 + index * 18} ${72 + index * 6}, ${104 + index * 12} ${138 + index * 4}`}
          />
        ))}
      </svg>
    </span>
  );
}

/** Where each DP particle leaves from, spread across the card rather than stacked. */
const DP_PARTICLE_OFFSETS = [-34, -20, -7, 7, 20, 34];

/**
 * The particles a DP change throws off, and the refreshed figure riding with
 * them. A debuff that takes the Digimon to nothing holds four times as long as an
 * ordinary one — the reference client's own 0.1s → 0.4s stretch — because that is
 * the change the player most needs to catch.
 */
export function DpPulseParticles({ pulse }: { pulse: DpPulse }) {
  const hold = pulse.kind === "debuffFatal" ? TIMINGS.dpPulseFatalHold : TIMINGS.dpPulseHold;
  return (
    <span
      className={`game-dp-pulse game-dp-pulse--${pulse.kind}`}
      style={{ "--dp-pulse-hold": `${hold}ms` } as CSSProperties}
      aria-hidden="true"
    >
      {DP_PARTICLE_OFFSETS.map((offset, index) => (
        <i key={index} style={{ "--dp-particle-x": `${offset}px`, "--dp-particle-index": index } as CSSProperties} />
      ))}
      <em>{formatDpDelta(Math.abs(pulse.to - pulse.from))}</em>
    </span>
  );
}

/** Stars in the entrance halo; each one is placed and delayed by its position in game.css. */
const SPARKLE_INDEXES = [0, 1, 2, 3, 4];

/** Stars orbiting a permanent that cannot attack yet, spaced evenly around the ellipse. */
const SUMMONING_STAR_INDEXES = [0, 1, 2, 3, 4, 5];

export function PermanentView({
  perm,
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
  freezePulse,
  effectSource,
  suspendDelayMs,
  width,
  refCb,
  onClick,
  drop,
  onPointerDown,
  onKeyboardActivate,
  onInspectStart,
  onInspectEnd,
}: {
  perm: Permanent;
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
  /** The attack/block lock that just landed on this permanent, which jolts the card. */
  freezePulse?: FreezePulse;
  /** This permanent's own effect is activating: it glows and throws a small particle. */
  effectSource?: boolean;
  /** The colour-keyed burst this permanent is playing, behind the card. */
  burst?: PermanentBurst;
  /** Held back while the card is still being announced centre-screen. */
  pending?: boolean;
  /** Staggers the suspend rotation so an unsuspend phase sweeps across the board. */
  suspendDelayMs?: number;
  /** Explicit card width; overrides the `compact` default. */
  width?: number;
  refCb?: (el: HTMLDivElement | null) => void;
  onClick?: () => void;
  drop?: DropAttrs;
  onPointerDown?: (e: React.PointerEvent) => void;
  /** Keyboard fallback for drag-only interactions (select to play or attack). */
  onKeyboardActivate?: () => void;
  onInspectStart?: (element: HTMLDivElement, immediate: boolean) => void;
  onInspectEnd?: () => void;
}) {
  const permanentWidth = width ?? (compact ? 76 : 116);
  const { t } = useTranslation();
  const topId = perm.topCard?.cardId;
  if (!topId) return null;
  const def = getCardDefinition(topId);
  const delta = perm.currentDP - perm.baseDP;
  const hasDpDelta = delta !== 0;
  const activeKeywords = [...perm.grantedKeywords].map(formatKeyword);
  const visibleKeywords = activeKeywords.slice(0, 3);
  const hiddenKeywordCount = activeKeywords.length - visibleKeywords.length;
  // Server truth (`Permanent.keywords`): the resolved keyword list already folds a
  // ＜Blocker＞ this Digimon only has because something granted it, so the shield is
  // never read off the printed art.
  const blocker = hasBlocker(perm);
  const sources = sourceCountBadge(perm);
  // Server truth as well (`Permanent.cannotAttack` and friends): the standing debuffs
  // an effect has imposed, worn for as long as they hold rather than only jolting the
  // card once when they land.
  const restrictions = restrictionBadges(perm);

  const cardName = def?.nameEn ?? topId;
  const activate = onKeyboardActivate ?? onClick;
  const interactive = !!activate || !!onPointerDown;
  const states = [
    perm.isSuspended ? t("overlay.suspended") : undefined,
    perm.summoningSick ? t("overlay.summoningSick") : undefined,
    ...restrictions.map((restriction) => t(restriction.labelKey)),
    // The coming fate joins the spoken state list rather than labelling the pill
    // itself: a nested aria-label would rewrite the card's own accessible name.
    fate ? t(fate.labelKey) : undefined,
  ].filter((state): state is string => state !== undefined);
  const stateLabel = states.length ? ` (${states.join(", ")})` : "";
  const dpLabel = hasDpDelta
    ? `, ${perm.currentDP.toLocaleString()} DP, DP ${delta > 0 ? "+" : "−"}${formatDpDelta(Math.abs(delta))}`
    : "";
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
      onMouseEnter={(event) => onInspectStart?.(event.currentTarget, false)}
      onMouseLeave={onInspectEnd}
      onFocus={(event) => onInspectStart?.(event.currentTarget, true)}
      onBlur={onInspectEnd}
      // Non-interactive permanents stay unlabeled: the card art inside already
      // exposes the card name, and a second name on the wrapper reads twice.
      role={interactive ? "button" : undefined}
      tabIndex={interactive || onInspectStart ? 0 : undefined}
      aria-label={
        onInspectStart
          ? `${t("game.inspectOpponent")}: ${cardName}${stateLabel}${dpLabel}`
          : interactive
            ? `${cardName}${stateLabel}${dpLabel}`
            : undefined
      }
      aria-describedby={onInspectStart ? "opponent-permanent-inspector" : undefined}
      className={
        [
          lunge ? `game-permanent-lunge--${lunge}` : "",
          shake ? "game-permanent-shake" : "",
          freezePulse ? "game-permanent-freeze" : "",
          effectSource ? "game-permanent--effect-source" : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined
      }
      {...(drop ?? {})}
      style={{
        position: "relative",
        cursor: onPointerDown ? "grab" : onClick ? "pointer" : "default",
        touchAction: "none",
        opacity: dimmed ? 0.4 : 1,
        // The reference client hides the destination until the centre-screen
        // announcement is over, rather than flying the card across the board.
        visibility: pending ? "hidden" : undefined,
        transform: highlight ? "translateY(-6px)" : "none",
        transition: "transform 160ms, opacity 160ms",
      }}
    >
      {candidate ? (
        <div
          style={{
            position: "absolute",
            inset: -5,
            borderRadius: 12,
            border: "2px solid var(--ds-warning)",
            animation: "aegis-pulse 1.2s ease-in-out infinite",
            zIndex: 3,
            pointerEvents: "none",
          }}
        />
      ) : null}
      {perm.stack.map((ci, i) => {
        const sc = COLORS[colorKey(getCardDefinition(ci.cardId)?.colors[0])];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: -4 - i * 4,
              top: 6 + i * 4,
              width: permanentWidth,
              height: permanentWidth * 1.4,
              borderRadius: 9,
              background: sc.soft,
              border: `1.5px solid ${sc.edge}66`,
              zIndex: 0,
            }}
          />
        );
      })}
      {perm.linked.map((ci, i) => {
        // A link card is plugged in sideways from the right, positioned so its link
        // portion stays visible under any earlier link cards (rules 4-8-3). It reads
        // as visually distinct from the (unrotated, upper-left) digivolution stack
        // above, per 4-8-2, and is purely decorative: pointer events pass through to
        // the host so selection/attack targeting on the permanent is unaffected.
        const slot = linkCardSlots(perm.linked.length, permanentWidth)[i]!;
        return (
          <div
            key={ci.instanceId}
            style={{
              position: "absolute",
              left: slot.left,
              top: slot.top,
              width: slot.width,
              height: slot.height,
              zIndex: 0,
              pointerEvents: "none",
            }}
          >
            {/* Counter-clockwise: maps the card's bottom name/DP band onto the edge
                that ends up exposed, so the readable strip is what actually peeks
                out (see linkCardSlots' doc comment for the rotation-direction math). */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transformOrigin: "top left",
                transform: "rotate(-90deg) translateX(-100%)",
              }}
            >
              <CardMini cardId={ci.cardId} width={slot.height} info zoomOnHover={false} />
            </div>
          </div>
        );
      })}
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
        {effectSource ? <span className="game-effect-source-spark" aria-hidden="true" /> : null}
        <CardMini
          cardId={topId}
          width={permanentWidth}
          suspended={perm.isSuspended}
          suspendDelayMs={suspendDelayMs}
          selected={highlight}
          attackable={candidate}
          dp={perm.currentDP}
          info
          zoomOnHover={false}
        />
        <span className="game-card-sparkles" aria-hidden="true">
          {SPARKLE_INDEXES.map((i) => (
            <span key={i} className="game-card-sparkle" />
          ))}
        </span>
        {/* Server truth (`Permanent.summoningSick`): this Digimon entered the field this
            turn and has no ＜Rush＞, so it cannot declare an attack yet. */}
        {perm.summoningSick ? (
          <span className="game-summoning-ring" aria-hidden="true">
            {SUMMONING_STAR_INDEXES.map((index) => (
              <i
                key={index}
                style={
                  {
                    "--star-index": index,
                    offsetDistance: `${(index * 100) / SUMMONING_STAR_INDEXES.length}%`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        ) : null}
        {/* The claw the reference client sweeps over a permanent that lost its
            battle, a beat before the shatter. Purely decorative, so it sits above
            the art and takes no pointer events. */}
        {claw ? <ClawSlash key={`claw-${perm.permanentId}`} /> : null}
        {dpPulse ? <DpPulseParticles key={dpPulse.key} pulse={dpPulse} /> : null}
      </div>
      {sources ? (
        <span
          aria-label={t("game.digivolutionSources", { count: sources.count })}
          style={{
            position: "absolute",
            top: -7,
            left: -7,
            zIndex: 2,
            background: COLORS[sources.color].base,
            color: COLORS[sources.color].on,
            minWidth: 18,
            height: 18,
            padding: "0 4px",
            borderRadius: 9,
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--ds-font-mono)",
            fontSize: 10,
            fontWeight: 700,
            boxShadow: "var(--ds-shadow-sm)",
          }}
        >
          ×{sources.count}
        </span>
      ) : null}
      {/* ＜Blocker＞ is the one keyword the board answers a question about every
          turn ("can that thing stop my attack?"), so it gets a shield of its own
          on the opposite corner rather than a slot in the keyword strip. */}
      {blocker ? (
        <span className="game-blocker-badge" aria-label={t("game.blockerBadge")}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 2.6 20 6v6.2c0 4.6-3.2 8-8 9.2-4.8-1.2-8-4.6-8-9.2V6z" />
          </svg>
        </span>
      ) : null}
      {fate ? (
        <span className={`game-fate-badge game-fate-badge--${fate.tone}`} data-fate={fate.fate} aria-hidden="true">
          <i aria-hidden="true">{fate.glyph}</i>
          {t(fate.labelKey)}
        </span>
      ) : null}
      {hasDpDelta ? (
        <span
          style={{
            position: "absolute",
            right: -8,
            bottom: 16,
            zIndex: 2,
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            padding: "2px 5px",
            borderRadius: 6,
            background: delta < 0 ? "var(--ds-danger)" : "var(--ds-success)",
            color: delta < 0 ? "var(--ds-on-danger)" : "var(--ds-on-success)",
            fontFamily: "var(--ds-font-mono)",
            fontSize: 9.5,
            fontWeight: 700,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
          }}
        >
          <span aria-hidden="true">{delta < 0 ? "↓" : "↑"}</span>
          DP {formatDpDelta(Math.abs(delta))}
        </span>
      ) : null}
      {activeKeywords.length > 0 ? (
        <div
          aria-label={`Active keywords: ${activeKeywords.join(", ")}`}
          style={{
            position: "absolute",
            left: "50%",
            top: -9,
            zIndex: 4,
            transform: "translateX(-50%)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 2,
            width: permanentWidth + 24,
            pointerEvents: "none",
          }}
        >
          {visibleKeywords.map((keyword) => (
            <span
              key={keyword}
              style={{
                padding: "1px 4px",
                borderRadius: 5,
                background: "var(--ds-foreground)",
                color: "var(--ds-background)",
                boxShadow: "var(--ds-shadow-sm)",
                fontFamily: "var(--ds-font-mono)",
                fontSize: 8,
                fontWeight: 700,
                lineHeight: 1.25,
                whiteSpace: "nowrap",
              }}
            >
              {keyword}
            </span>
          ))}
          {hiddenKeywordCount > 0 ? (
            <span
              aria-label={`${hiddenKeywordCount} more keywords`}
              style={{
                padding: "1px 4px",
                borderRadius: 5,
                background: "var(--ds-foreground-muted)",
                color: "var(--ds-background)",
                boxShadow: "var(--ds-shadow-sm)",
                fontFamily: "var(--ds-font-mono)",
                fontSize: 8,
                fontWeight: 700,
                lineHeight: 1.25,
                whiteSpace: "nowrap",
              }}
            >
              +{hiddenKeywordCount}
            </span>
          ) : null}
        </div>
      ) : null}
      {restrictions.length > 0 ? (
        /* Spoken through the wrapper's own state list above, so the chips
           themselves stay out of the accessibility tree rather than repeating it. */
        <div className="game-restriction-badges" aria-hidden="true">
          {restrictions.map((restriction) => (
            <span key={restriction.kind} className="game-restriction-badge">
              <i aria-hidden="true">⊘</i>
              {t(restriction.labelKey)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BreedingSlot({
  perm,
  label,
  candidate,
  focused,
  compact,
  burst,
  width,
  onClick,
  drop,
}: {
  perm?: Permanent;
  label: string;
  candidate?: boolean;
  /** The breeding step is open: the slot is the one lit thing on a dimmed board. */
  focused?: boolean;
  compact?: boolean;
  /**
   * The burst the slot is playing: a hatch opens white into blue behind a dark
   * vignette, an evolution in breeding takes the same centre-lit treatment.
   */
  burst?: PermanentBurst;
  /** Explicit slot width; overrides the `compact` default. */
  width?: number;
  onClick?: () => void;
  drop?: DropAttrs;
}) {
  const { t } = useTranslation();
  const w = width ?? (compact ? 66 : 100);
  return (
    <div
      className={`game-breeding-slot${burst ? " game-breeding-slot--lit" : ""}${focused ? " game-breeding-slot--focus" : ""}`}
      data-burst={burst?.variant}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: compact ? 2 : 5 }}
    >
      <div
        onClick={onClick}
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onClick();
              }
            : undefined
        }
        className="game-breeding-slot__box"
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? label : undefined}
        {...(drop ?? {})}
        style={{
          position: "relative",
          width: w,
          height: Math.round(w * 1.34),
          borderRadius: compact ? 8 : 12,
          border: candidate ? "2px solid var(--ds-warning)" : "1.5px dashed var(--ds-border-strong)",
          display: "grid",
          placeItems: "center",
          background: "var(--ds-surface-muted)",
          cursor: onClick ? "pointer" : "default",
          animation: candidate ? "aegis-pulse 1.2s ease-in-out infinite" : "none",
        }}
      >
        {burst ? (
          <span className="game-breeding-slot__burst" aria-hidden="true">
            <CardBurst key={burst.key} variant={burst.variant} color={burst.color} />
          </span>
        ) : null}
        {perm && perm.topCard?.cardId ? (
          <PermanentView perm={perm} compact={compact} width={Math.round(w * 1.16)} />
        ) : (
          <span
            style={{
              fontSize: compact ? 8 : 10,
              color: "var(--ds-foreground-disabled)",
              fontFamily: "var(--ds-font-mono)",
            }}
          >
            {t("game.emptySlot")}
          </span>
        )}
      </div>
      <span
        style={{
          fontFamily: "var(--ds-font-mono)",
          fontSize: compact ? 8 : 10,
          letterSpacing: "0.05em",
          color: "var(--ds-foreground-muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/** Total length of the reference client's tab sweep (MemoryObject.cs:113): the marker move. */
const MEMORY_SWEEP_MS = 200;
const MEMORY_SWEEP_CHIP_MS = 120;

/**
 * The chips memory passed over on its way to `to`, in travel order and excluding
 * both endpoints. A single-step change traverses nothing, so it sweeps nothing.
 * The bounds are derived rather than stepped to, so no input can outrun the loop.
 */
function traversedChips(from: number, to: number): number[] {
  const first = Math.floor(Math.min(from, to)) + 1;
  const last = Math.ceil(Math.max(from, to)) - 1;
  const chips: number[] = [];
  for (let v = first; v <= last; v += 1) chips.push(v);
  return to < from ? chips.reverse() : chips;
}

/**
 * The red arc a memory jump leaves behind, drawn over the chips it crossed. The
 * geometry is pure (`memoryArc.ts`); the box is stretched over the track, so the
 * stroke is kept from stretching with it.
 */
export function MemoryArc({ from, to }: { from: number; to: number }) {
  return (
    <svg
      className="game-memory-arc"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Normalised length, so the draw-on dash array is the same 100 units whatever
          the arc's real length turns out to be. */}
      <path d={memoryArcPath(from, to)} pathLength={100} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Where memory would land if the card the player is holding were played. Same
 * shape as the arc above, hanging under the chips and dashed rather than solid,
 * so the two never read as one line when both are on screen.
 */
export function MemoryPredictionArc({ from, to }: { from: number; to: number }) {
  return (
    <svg
      className="game-memory-prediction"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={memoryPredictionPath(from, to)} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function MemoryGauge({
  value,
  compact,
  phaseLabel,
  phaseSweeping,
  arc,
  prediction,
}: {
  value: number;
  compact?: boolean;
  /** Current phase, printed as the pill at the gauge's left end (reference-client style). */
  phaseLabel?: string;
  /** The unsuspend phase is sweeping the board, which the phase pill pulses along with. */
  phaseSweeping?: boolean;
  /** Forces the jump arc, for the showcase page — a match derives it from the value that changed. */
  arc?: { from: number; to: number };
  /** Where memory would land if the held card were played, while one is hovered or dragged. */
  prediction?: number;
}) {
  const { t } = useTranslation();
  const gaugeLabel = t("game.memoryGauge", { memory: value > 0 ? `+${value}` : `${value}` });
  const ticks: number[] = [];
  for (let v = 10; v >= -10; v -= 1) ticks.push(v);
  const cv = Math.max(-10, Math.min(10, value));
  // Swept chips are remounted so their keyframes restart, which is why the sweep
  // needs a generation counter rather than a class toggle on a stable element.
  const previousValue = useRef<number | null>(null);
  const sweepGeneration = useRef(0);
  const previous = previousValue.current;
  if (previous !== null && previous !== cv) sweepGeneration.current += 1;
  previousValue.current = cv;
  const swept = previous === null ? [] : traversedChips(previous, cv);
  // A single step is already told by the marker pop, so only a real jump is traced.
  const arcEnds =
    arc ?? (previous !== null && shouldDrawMemoryArc(previous, cv) ? { from: previous, to: cv } : undefined);
  const sweepDelay = (chip: number) => {
    const index = swept.indexOf(chip);
    if (index < 0 || swept.length === 0) return undefined;
    return `${Math.round(((MEMORY_SWEEP_MS - MEMORY_SWEEP_CHIP_MS) * index) / swept.length)}ms`;
  };
  // The gauge reads like the physical one: the viewer's half is always red and the
  // opponent's half always blue, whatever identity colours the players picked. Only
  // the marker moves — a yellow-lit chip on the current memory value.
  const renderCoin = (v: number) => {
    const isMarker = v === cv;
    const isSwept = swept.includes(v);
    const side = v > 0 ? "you" : v < 0 ? "opp" : "zero";
    const fill = v > 0 ? "var(--battle-memory-you)" : v < 0 ? "var(--battle-memory-opp)" : "var(--battle-memory-zero)";
    const ink = v === 0 ? "var(--battle-memory-zero-ink)" : "#fff";
    return (
      <div
        key={isSwept ? `${v}:${sweepGeneration.current}` : v}
        data-memory-side={side}
        className={`game-memory-coin${isMarker ? " game-memory-coin--marker" : ""}${isSwept ? " game-memory-coin--swept" : ""}${v % 5 === 0 ? " game-memory-coin--five" : ""}`}
        style={{ background: fill, color: ink, animationDelay: sweepDelay(v) }}
      >
        <span className="game-memory-coin__n">{Math.abs(v)}</span>
      </div>
    );
  };

  return (
    <div
      className={`game-memory-gauge${compact ? " game-memory-gauge--compact" : ""}`}
      role="img"
      aria-label={gaugeLabel}
      style={{ display: "flex", minWidth: 0, alignItems: "center", justifyContent: "center" }}
    >
      {phaseLabel ? (
        <span
          className={`game-memory-gauge__phase${phaseSweeping ? " game-memory-gauge__phase--sweeping" : ""}`}
          aria-hidden
        >
          {phaseLabel}
        </span>
      ) : null}
      <div className="game-memory-gauge__track">
        {/* The current value is lit by the chip itself — a wider hexagon wearing a
            crisp ring (game.css). The halo that used to ride over it was positioned
            by cell fraction, which the marker's own extra width puts it beside, and
            a blurred disc that wide washed over its neighbours either way. */}
        {ticks.map(renderCoin)}
        {arcEnds ? <MemoryArc key={sweepGeneration.current} from={arcEnds.from} to={arcEnds.to} /> : null}
        {prediction !== undefined && shouldDrawMemoryPrediction(cv, prediction) ? (
          <MemoryPredictionArc from={cv} to={prediction} />
        ) : null}
        {prediction !== undefined ? (
          <span
            className="game-memory-prediction__marker"
            style={{
              left: `calc(var(--memory-track-pad-x) + (100% - var(--memory-track-pad-x) * 2) * ${memoryCellCenterFraction(prediction)})`,
            }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * The one round control on the memory band. It rotates through the turn — ending
 * the breeding step, then the turn, then waiting out the opponent's — and sends
 * the same `endPhase` intent in both of its active states, because that is the
 * only intent the server advances a phase on.
 */
export function TurnControl({
  state,
  onEndPhase,
  covered: coveredOverride,
}: {
  state: TurnControlState;
  onEndPhase: () => void;
  /** Forces the debounce cover on, for the showcase page. */
  covered?: boolean;
}) {
  const { t } = useTranslation();
  const waiting = state === "waiting";
  // The reference client parks an invisible disc over the control for 1.5s after
  // a click, so a double tap cannot send a second endPhase into a phase that has
  // already moved on. A UI guard only: the server refuses the repeat either way,
  // and the control never LOOKS disabled — it just stops answering for the beat.
  //
  // The cover is also lifted the moment the control's own state changes, which is
  // the board confirming the click landed. Without that, a player who ends the
  // breeding step and then means to end the turn would have their second — and
  // entirely different — action swallowed by a guard meant for a stutter. It
  // carries the state it was raised in as well, so the lift happens in the same
  // render as the label change rather than one effect behind it.
  const [cover, setCover] = useState<{ id: number; ms: number; state: TurnControlState } | null>(null);
  useEffect(() => {
    if (!cover) return;
    const timer = setTimeout(() => setCover((current) => (current?.id === cover.id ? null : current)), cover.ms);
    return () => clearTimeout(timer);
  }, [cover]);
  useEffect(() => setCover(null), [state]);
  const covered = coveredOverride ?? (!waiting && cover?.state === state);
  return (
    <button
      type="button"
      className={`game-end-turn-orb${waiting ? " game-end-turn-orb--waiting" : ""}${
        state === "endBreeding" ? " game-end-turn-orb--breeding" : ""
      }${covered ? " game-end-turn-orb--covered" : ""}`}
      data-state={state}
      disabled={waiting}
      aria-disabled={covered || undefined}
      onClick={() => {
        // Covered means the previous click is still in flight; swallow this one
        // rather than disabling the button, which would read as "not your turn".
        if (covered) return;
        setCover({ id: Date.now(), ms: TIMINGS.turnControlCover, state });
        onEndPhase();
      }}
    >
      {/* The ring the reference client turns around the control for as long as it
          is the thing the player is meant to press. */}
      {!waiting ? <span className="game-end-turn-orb__ring" aria-hidden="true" /> : null}
      {t(turnControlLabelKey(state))}
    </button>
  );
}

export const HAND_CARD_WIDTH = 132;
/** Tablet and split-screen widths, where the dock has to give height back to the board. */
export const HAND_CARD_WIDTH_COMPACT = 104;
/** Room under the cards for the fan's downward arc and the rotated bottom corners. */
const HAND_FAN_ROOM = 28;
const HAND_MAX_FAN = 14;
/** The outermost cards are rotated, so each end of the fan reaches past its card box. */
const HAND_TILT_BLEED = 20;

const handMinOverlap = (cardWidth: number) => Math.round(cardWidth * 0.26);
/**
 * The sliver a buried card keeps: enough to read its cost and level corner with a
 * mouse, and a whole 44px touch target where the pointer is a finger.
 */
const HAND_MIN_EXPOSURE = 30;
export const HAND_MIN_EXPOSURE_TOUCH = 44;
/**
 * How far a card may be buried before the fan stops tightening. A hand big enough
 * to need more than this overflows, which only phone widths reach — there the row
 * scrolls instead.
 */
const handMaxOverlap = (cardWidth: number, minExposure: number) => cardWidth - minExposure;
const handRowHeight = (cardWidth: number) => Math.round(cardWidth * 1.4) + HAND_FAN_ROOM + 1;

export function handOverlap(
  cardCount: number,
  rowWidth: number,
  cardWidth = HAND_CARD_WIDTH,
  minExposure = HAND_MIN_EXPOSURE,
): number {
  const min = handMinOverlap(cardWidth);
  if (cardCount < 2 || rowWidth <= 0) return min;
  const available = rowWidth - HAND_TILT_BLEED * 2;
  const needed = cardWidth * cardCount - min * (cardCount - 1);
  if (needed <= available) return min;
  const fitting = (cardWidth * cardCount - available) / (cardCount - 1);
  return Math.max(min, Math.min(handMaxOverlap(cardWidth, minExposure), Math.ceil(fitting)));
}

function useElementWidth(element: HTMLElement | null): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element) return;
    if (typeof ResizeObserver !== "function") {
      setWidth(element.getBoundingClientRect().width);
      return;
    }
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return width;
}

/**
 * A board-mode `selectCards` decision answered out of this hand. While it is set
 * the hand stops being a play surface: cards are picked in place, in order, and
 * dragging is off so a pick cannot become an accidental play.
 */
export interface HandSelection {
  selectableInstanceIds: readonly string[];
  /** Picked instance ids, in the order they were chosen — the badge is the position. */
  pickedInstanceIds: readonly string[];
  onToggle: (instanceId: string) => void;
}

export function Hand({
  cards,
  selectedInstanceId,
  startDrag,
  selectCard,
  draggingInstanceId,
  selection,
  shakeInstanceId,
  effectSourceInstanceId,
  onHoverChange,
  cardWidth = HAND_CARD_WIDTH,
  minExposure = HAND_MIN_EXPOSURE,
}: {
  cards: HandEntry[];
  selectedInstanceId?: string;
  startDrag: (index: number, e: React.PointerEvent) => void;
  selectCard?: (index: number) => void;
  draggingInstanceId?: string;
  selection?: HandSelection;
  /** The card a refused action was sent from: it shakes where it sits. */
  shakeInstanceId?: string;
  /** An Option activating out of the hand: it rises out of the fan with an orange outline. */
  effectSourceInstanceId?: string;
  /** Which card the pointer is over, so the memory gauge can predict its play. */
  onHoverChange?: (instanceId: string | undefined) => void;
  cardWidth?: number;
  /** How much of a buried card stays tappable. */
  minExposure?: number;
}) {
  const { t } = useTranslation();
  const n = cards.length;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  const rowWidth = useElementWidth(rowEl);
  const drawn = useEnterAnimation(cards.map((entry) => entry.instanceId));
  // Two copies of one card look identical in the fan, so a selection labels each
  // one by its position among the copies the way the dialog's grid does.
  const copyLabels = new Map<string, string>();
  if (selection) {
    const totals = new Map<string, number>();
    for (const entry of cards) totals.set(entry.cardId, (totals.get(entry.cardId) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const entry of cards) {
      const total = totals.get(entry.cardId) ?? 0;
      const index = (seen.get(entry.cardId) ?? 0) + 1;
      seen.set(entry.cardId, index);
      if (total > 1) copyLabels.set(entry.instanceId, t("overlay.cardCopy", { index, total }));
    }
  }
  // The hand tightens its own fan until it fits the dock. Without this a big hand
  // simply grew past the board and painted over the sidebar.
  const overlap = handOverlap(n, rowWidth, cardWidth, minExposure);
  // A pick is taken from the pointer, not from the click that may follow it. On
  // touch the hand is a `pan-x` scroll-snap row, so the browser is free to turn a
  // tap into a scroll or to retarget the trailing click at the row — which left a
  // board-mode selection unanswerable with a finger. Every other tap on this
  // screen is already read this way (see GameScreen's drag/tap recognizer).
  const pickPress = useRef<{
    pointerId: number;
    instanceId: string;
    x: number;
    y: number;
    touch: boolean;
  } | null>(null);
  /* The card the pointer has just picked, so the click that trails the same
     gesture cannot toggle it straight back. Only the click is dropped — a browser
     that sends no `pointerup` on the card still answers through its click. */
  const pointerPicked = useRef<string | null>(null);
  const beginPick = (instanceId: string, event: React.PointerEvent) => {
    // No capture and no preventDefault: the row must stay pannable, exactly as it
    // is while a card is being dragged out of the hand.
    pointerPicked.current = null;
    pickPress.current = {
      pointerId: event.pointerId,
      instanceId,
      x: event.clientX,
      y: event.clientY,
      touch: event.pointerType !== "mouse",
    };
  };
  const finishPick = (instanceId: string, event: React.PointerEvent) => {
    const press = pickPress.current;
    pickPress.current = null;
    if (!press || press.pointerId !== event.pointerId || press.instanceId !== instanceId) return;
    const gesture = pressGesture({ dx: event.clientX - press.x, dy: event.clientY - press.y, touch: press.touch });
    if (gesture !== "press") return;
    pointerPicked.current = instanceId;
    selection?.onToggle(instanceId);
  };
  return (
    <div
      ref={setRowEl}
      data-testid="hand"
      className="game-hand"
      style={{
        position: "relative",
        boxSizing: "border-box",
        height: handRowHeight(cardWidth),
        minWidth: 0,
        paddingBottom: HAND_FAN_ROOM,
        display: "flex",
        justifyContent: "safe center",
        alignItems: "flex-end",
      }}
    >
      {cards.map((entry, i) => {
        const mid = (n - 1) / 2;
        const off = i - mid;
        // The arc always spends the same room, however many cards are fanned, so
        // the outermost card never drops below the dock and out of the window.
        const fan = mid > 0 ? (Math.abs(off) / mid) * HAND_MAX_FAN : 0;
        const pickPosition = selection ? selection.pickedInstanceIds.indexOf(entry.instanceId) : -1;
        const picked = pickPosition !== -1;
        const pickable = selection?.selectableInstanceIds.includes(entry.instanceId) ?? false;
        const sel = selection ? picked : selectedInstanceId === entry.instanceId;
        const dragging = draggingInstanceId === entry.instanceId;
        const hov = hoveredIndex === i;
        const playable = selection ? pickable : entry.playableFromHand || entry.digivolveTargetPermanentIds.length > 0;
        // Hover raises a buried card out of the fan so its face can be read; it
        // never grows it. A card is inspected by clicking it, which opens the same
        // focused overlay the touch layout uses.
        const style: CSSProperties = {
          marginLeft: i === 0 ? 0 : -overlap,
          cursor: "grab",
          touchAction: "none",
          transform: `translateY(${sel ? -34 : hov ? -18 : fan}px) rotate(${sel || hov ? 0 : off * 4}deg)`,
          transformOrigin: "bottom center",
          transition: "transform 200ms",
          zIndex: sel ? 50 : hov ? 40 : 10 + i,
          opacity: dragging ? 0.3 : 1,
          filter: sel
            ? "drop-shadow(0 16px 26px rgba(15,23,42,0.32))"
            : hov
              ? "drop-shadow(0 10px 18px rgba(15,23,42,0.28))"
              : "drop-shadow(0 4px 8px rgba(15,23,42,0.14))",
        };
        return (
          <div
            key={entry.instanceId}
            onPointerDown={
              selection ? (pickable ? (e) => beginPick(entry.instanceId, e) : undefined) : (e) => startDrag(i, e)
            }
            onPointerUp={selection && pickable ? (e) => finishPick(entry.instanceId, e) : undefined}
            onPointerCancel={selection ? () => (pickPress.current = null) : undefined}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              if (selection) {
                if (pickable) selection.onToggle(entry.instanceId);
                return;
              }
              selectCard?.(i);
            }}
            onClick={(event) => {
              if (selection) {
                // The gesture that already answered on `pointerup` sends this click
                // too; anything else (keyboard, assistive activation, a browser that
                // reports no pointerup here) is still a pick.
                if (pointerPicked.current === entry.instanceId) {
                  pointerPicked.current = null;
                  return;
                }
                if (pickable) selection.onToggle(entry.instanceId);
                return;
              }
              // Pointer taps are resolved by GameScreen's drag/tap recognizer.
              // A zero-detail click is keyboard/assistive activation and needs a
              // direct deterministic selection path without toggling twice.
              if (event.detail === 0) selectCard?.(i);
            }}
            onMouseEnter={() => {
              setHoveredIndex(i);
              onHoverChange?.(entry.instanceId);
            }}
            onMouseLeave={() => {
              setHoveredIndex(null);
              onHoverChange?.(undefined);
            }}
            role="button"
            tabIndex={0}
            aria-label={
              t(selection ? "game.pickCard" : "game.selectCard", {
                card: getCardDefinition(entry.cardId)?.nameEn ?? entry.cardId,
              }) +
              (copyLabels.has(entry.instanceId) ? `, ${copyLabels.get(entry.instanceId)}` : "") +
              (picked ? t("overlay.selected") : "")
            }
            aria-disabled={selection && !pickable ? true : undefined}
            aria-pressed={sel}
            className={[
              "game-hand-card",
              playable ? "game-hand-card--playable" : "",
              drawn.has(entry.instanceId) ? "game-hand-card--drawn" : "",
              selection && !pickable && !picked ? "game-hand-card--unpickable" : "",
              picked ? "game-hand-card--picked" : "",
              shakeInstanceId === entry.instanceId ? "game-hand-card--shake" : "",
              effectSourceInstanceId === entry.instanceId ? "game-hand-card--effect-source" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              selection
                ? // Nothing is dragged out of a hand that is answering a decision, so
                  // the row keeps its sideways pan on touch instead of claiming the
                  // gesture for a drag that cannot happen.
                  { ...style, cursor: pickable ? "pointer" : "default", touchAction: "pan-x" }
                : style
            }
          >
            <CardFull cardId={entry.cardId} width={cardWidth} selected={sel} zoomOnHover={false} />
            {picked ? (
              <span
                className="game-hand-card__pick-badge"
                aria-label={t("game.pickPosition", { position: pickPosition + 1 })}
              >
                {pickPosition + 1}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface ArrowPoint {
  x: number;
  y: number;
}

/**
 * The reference client draws a straight beam between the two card centres, not a
 * curve: the arc the web port had made the tip approach the target sideways, which
 * is what left it reading as pointing past the card rather than into it.
 */
function beamBetween(from: ArrowPoint, to: ArrowPoint): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

/**
 * The target arrow (`TargetArrow.cs`). One tail, one straight beam per target,
 * drawn from board coordinates the caller re-measures as the cards move — which is
 * what keeps a declared attack pointing at its target while the board shifts under
 * it. The caller clips both ends to the cards' edges (`arrowGeometry.ts`), so the
 * head points at the target rather than covering it.
 *
 * `tracking` is the reference client's persistent arrow: it extends with two quick
 * flashes and then stays up until the thing it is about is over. Without it the
 * beam draws itself once, which is what a hovering drag preview wants.
 */
export function AttackArrow({
  from,
  to,
  kind = "attack",
  tracking = false,
}: {
  from: ArrowPoint;
  /** One target or several; an effect can be aimed at more than one card at a time. */
  to: ArrowPoint | readonly ArrowPoint[];
  kind?: "attack" | "effect";
  tracking?: boolean;
}) {
  const targets = Array.isArray(to) ? (to as readonly ArrowPoint[]) : [to as ArrowPoint];
  const headId = `aegis-arrowhead-${kind}`;
  return (
    <svg
      className={`game-attack-arrow game-attack-arrow--${kind}${tracking ? " game-attack-arrow--tracking" : ""}`}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 60, pointerEvents: "none" }}
    >
      <defs>
        {/* Marker units are stroke widths, so the head grows with the arc rather
            than needing its own breakpoint. The dark rim is what keeps the tip
            readable over bright card art. */}
        <marker id={headId} markerWidth="5" markerHeight="5" refX="3.6" refY="2.5" orient="auto">
          <path
            className="game-attack-arrow__head"
            d="M0,0 L3.6,2.5 L0,5 Z"
            fill={`var(--battle-arrow-${kind})`}
            stroke="var(--battle-arrow-casing)"
            strokeWidth={0.3}
            strokeLinejoin="round"
          />
        </marker>
      </defs>
      {targets.map((target, index) => {
        const arc = beamBetween(from, target);
        return (
          <g key={index}>
            {/* Soft glow pass under the beam, the way the reference client draws attacks.
                The glow and the casing end flat: a round cap on the wider strokes
                would poke out past the head as a nub on the tip. */}
            <path
              className="game-attack-arrow__stroke game-attack-arrow__stroke--glow"
              d={arc}
              pathLength={100}
              strokeDasharray={100}
              fill="none"
              stroke={`var(--battle-arrow-${kind}-glow)`}
              strokeWidth={14}
              strokeLinecap="butt"
            />
            {/* Dark casing between the glow and the bright core: without it the beam
                disappears into pale card art wherever it crosses one. */}
            <path
              className="game-attack-arrow__stroke game-attack-arrow__stroke--casing"
              d={arc}
              pathLength={100}
              strokeDasharray={100}
              fill="none"
              stroke="var(--battle-arrow-casing)"
              strokeWidth={10}
              strokeLinecap="butt"
            />
            <path
              className="game-attack-arrow__stroke game-attack-arrow__stroke--core"
              d={arc}
              pathLength={100}
              strokeDasharray={100}
              fill="none"
              stroke={`var(--battle-arrow-${kind})`}
              strokeWidth={6}
              strokeLinecap="round"
              markerEnd={`url(#${headId})`}
            />
          </g>
        );
      })}
    </svg>
  );
}
