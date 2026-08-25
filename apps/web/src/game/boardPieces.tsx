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
import { formatKeyword } from "./keywordDisplay";
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
  /** Server projection: own permanents this card may digivolve onto right now. */
  digivolveTargetPermanentIds: readonly string[];
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
  refEl?: (el: HTMLDivElement | null) => void;
  onClick?: () => void;
  drop?: DropAttrs;
  useSelectedSleeve?: boolean;
}) {
  const w = compact ? 42 : 62;
  if (shield) {
    return (
      <div
        className={`game-security-shield game-security-shield--${shield}${glow ? " game-security-shield--glow" : ""}${className ? ` ${className}` : ""}`}
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
        <span className="game-security-shield__count" aria-hidden>
          {count}
        </span>
        <span className="game-security-shield__label" aria-hidden>
          {label}
        </span>
      </div>
    );
  }
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
      <div aria-hidden style={{ position: "relative", width: w, height: w * 1.4 }}>
        {count > 1 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: "translate(3px,3px)",
              borderRadius: 8,
              background: "var(--ds-surface-muted)",
              border: "1px solid var(--ds-border)",
            }}
          />
        ) : null}
        {count > 2 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: "translate(6px,6px)",
              borderRadius: 8,
              background: "var(--ds-surface-muted)",
              border: "1px solid var(--ds-border)",
            }}
          />
        ) : null}
        <div
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
        {topCardId ? (
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

/** Stars in the entrance halo; each one is placed and delayed by its position in game.css. */
const SPARKLE_INDEXES = [0, 1, 2, 3, 4];

export function PermanentView({
  perm,
  highlight,
  candidate,
  dimmed,
  compact,
  lunge,
  burst,
  pending,
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
  /** The colour-keyed burst this permanent is playing, behind the card. */
  burst?: PermanentBurst;
  /** Held back while the card is still being announced centre-screen. */
  pending?: boolean;
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
  const key = colorKey(def?.colors[0]);
  const c = COLORS[key];
  const delta = perm.currentDP - perm.baseDP;
  const hasDpDelta = delta !== 0;
  const activeKeywords = [...perm.grantedKeywords].map(formatKeyword);
  const visibleKeywords = activeKeywords.slice(0, 3);
  const hiddenKeywordCount = activeKeywords.length - visibleKeywords.length;

  const cardName = def?.nameEn ?? topId;
  const activate = onKeyboardActivate ?? onClick;
  const interactive = !!activate || !!onPointerDown;
  const stateLabel = perm.isSuspended ? ` (${t("overlay.suspended")})` : "";
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
      className={lunge ? `game-permanent-lunge--${lunge}` : undefined}
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
          and again on every digivolution. */}
      <div
        key={`${perm.permanentId}:${perm.stack.length}`}
        className="game-card-enter"
        style={{ position: "relative", zIndex: 1 }}
      >
        {burst ? <CardBurst key={burst.key} variant={burst.variant} color={burst.color} /> : null}
        <CardMini
          cardId={topId}
          width={permanentWidth}
          suspended={perm.isSuspended}
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
      </div>
      {perm.stack.length ? (
        <span
          style={{
            position: "absolute",
            top: -7,
            left: -7,
            zIndex: 2,
            background: c.base,
            color: c.on,
            width: 18,
            height: 18,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--ds-font-mono)",
            fontSize: 10,
            fontWeight: 700,
            boxShadow: "var(--ds-shadow-sm)",
          }}
        >
          {perm.stack.length}
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
    </div>
  );
}

export function BreedingSlot({
  perm,
  label,
  candidate,
  compact,
  burst,
  width,
  onClick,
  drop,
}: {
  perm?: Permanent;
  label: string;
  candidate?: boolean;
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
      className={`game-breeding-slot${burst ? " game-breeding-slot--lit" : ""}`}
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

export function MemoryGauge({
  value,
  compact,
  phaseLabel,
}: {
  value: number;
  compact?: boolean;
  /** Current phase, printed as the pill at the gauge's left end (reference-client style). */
  phaseLabel?: string;
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
        <span className="game-memory-gauge__phase" aria-hidden>
          {phaseLabel}
        </span>
      ) : null}
      <div className="game-memory-gauge__track">{ticks.map(renderCoin)}</div>
    </div>
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
  cardWidth = HAND_CARD_WIDTH,
  minExposure = HAND_MIN_EXPOSURE,
}: {
  cards: HandEntry[];
  selectedInstanceId?: string;
  startDrag: (index: number, e: React.PointerEvent) => void;
  selectCard?: (index: number) => void;
  draggingInstanceId?: string;
  selection?: HandSelection;
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
            onPointerDown={selection ? undefined : (e) => startDrag(i, e)}
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
                if (pickable) selection.onToggle(entry.instanceId);
                return;
              }
              // Pointer taps are resolved by GameScreen's drag/tap recognizer.
              // A zero-detail click is keyboard/assistive activation and needs a
              // direct deterministic selection path without toggling twice.
              if (event.detail === 0) selectCard?.(i);
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
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
            ]
              .filter(Boolean)
              .join(" ")}
            style={selection ? { ...style, cursor: pickable ? "pointer" : "default" } : style}
          >
            <CardFull cardId={entry.cardId} width={cardWidth} selected={sel} />
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

export function AttackArrow({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const midX = (from.x + to.x) / 2;
  const arc = `M ${from.x} ${from.y} Q ${midX} ${(from.y + to.y) / 2 - 90} ${to.x} ${to.y}`;
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 60, pointerEvents: "none" }}>
      <defs>
        <marker id="aegis-arrowhead" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
          <path className="game-attack-arrow__head" d="M0,0 L6,3 L0,6 Z" fill="var(--battle-attack)" />
        </marker>
      </defs>
      {/* Soft glow pass under the arc, the way the reference client draws attacks. */}
      <path
        className="game-attack-arrow__stroke"
        d={arc}
        pathLength={100}
        strokeDasharray={100}
        fill="none"
        stroke="var(--battle-attack-glow)"
        strokeWidth={10}
        strokeLinecap="round"
      />
      <path
        className="game-attack-arrow__stroke"
        d={arc}
        pathLength={100}
        strokeDasharray={100}
        fill="none"
        stroke="var(--battle-attack)"
        strokeWidth={4.5}
        strokeLinecap="round"
        markerEnd="url(#aegis-arrowhead)"
      />
    </svg>
  );
}
