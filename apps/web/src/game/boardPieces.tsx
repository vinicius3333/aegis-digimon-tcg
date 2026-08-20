/* Board sub-components — piles, permanents, breeding slot, memory gauge, hand,
   attack arrow. Presentational; they read real Permanent / count data and take
   interaction handlers (click / drop zones / pointer-drag) as props. */

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { getCardDefinition, type Permanent } from "@aegis/shared";
import { COLORS, colorKey, type ColorName } from "../design/theme";
import { CardBack, CardFull, CardMini } from "../design/cards";
import { linkCardSlots, parseActivatable, type ActivatableEntry } from "./boardModel";
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
  refEl?: (el: HTMLDivElement | null) => void;
  onClick?: () => void;
  drop?: DropAttrs;
  useSelectedSleeve?: boolean;
}) {
  const w = compact ? 42 : 62;
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

export function PermanentView({
  perm,
  highlight,
  candidate,
  dimmed,
  compact,
  width,
  refCb,
  onClick,
  drop,
  onPointerDown,
  onKeyboardActivate,
  onActivateEffect,
  onInspectStart,
  onInspectEnd,
}: {
  perm: Permanent;
  highlight?: boolean;
  candidate?: boolean;
  dimmed?: boolean;
  compact?: boolean;
  /** Explicit card width; overrides the `compact` default. */
  width?: number;
  refCb?: (el: HTMLDivElement | null) => void;
  onClick?: () => void;
  drop?: DropAttrs;
  onPointerDown?: (e: React.PointerEvent) => void;
  /** Keyboard fallback for drag-only interactions (select to play or attack). */
  onKeyboardActivate?: () => void;
  onActivateEffect?: (instanceId: string, effectKey: string) => void;
  onInspectStart?: (element: HTMLDivElement, immediate: boolean) => void;
  onInspectEnd?: () => void;
}) {
  const permanentWidth = width ?? (compact ? 76 : 116);
  const { t } = useTranslation();
  const [showEffects, setShowEffects] = useState(false);
  const topId = perm.topCard?.cardId;
  if (!topId) return null;
  const def = getCardDefinition(topId);
  const key = colorKey(def?.colors[0]);
  const c = COLORS[key];
  const delta = perm.currentDP - perm.baseDP;
  const hasDpDelta = delta !== 0;
  const activatable = onActivateEffect ? parseActivatable(perm.activatableEffectsJson) : [];
  const hasEffects = activatable.length > 0;
  const activeKeywords = [...perm.grantedKeywords].map(formatKeyword);
  const visibleKeywords = activeKeywords.slice(0, 3);
  const hiddenKeywordCount = activeKeywords.length - visibleKeywords.length;

  const handleEffectClick = (e: React.MouseEvent, entry: ActivatableEntry) => {
    e.stopPropagation();
    setShowEffects(false);
    onActivateEffect!(entry.instanceId, entry.effectKey);
  };

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
      {...(drop ?? {})}
      style={{
        position: "relative",
        cursor: onPointerDown ? "grab" : onClick ? "pointer" : "default",
        touchAction: "none",
        opacity: dimmed ? 0.4 : 1,
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
      <div style={{ position: "relative", zIndex: 1 }}>
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
      {hasEffects ? (
        <button
          className="game-effect-button"
          // The permanent above starts an attack drag on pointerdown, and its
          // pointerup tap opens the card menu — which on touch swallowed this
          // button's click entirely. The gesture has to stop at the button.
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (activatable.length === 1) handleEffectClick(e, activatable[0]!);
            else setShowEffects((v) => !v);
          }}
          title={activatable.length === 1 ? activatable[0]!.description : t("game.activateEffect")}
          aria-label={
            activatable.length === 1
              ? `${t("game.activateEffect")}: ${activatable[0]!.description}`
              : t("game.activateEffect")
          }
          aria-expanded={activatable.length > 1 ? showEffects : undefined}
          style={{
            position: "absolute",
            bottom: -13,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 6,
            width: "max-content",
            maxWidth: permanentWidth + 28,
          }}
        >
          <span aria-hidden="true">⚡</span>
          <span>Main</span>
          {activatable.length > 1 ? (
            <span className="game-effect-button__count" aria-hidden="true">
              {activatable.length}
            </span>
          ) : null}
        </button>
      ) : null}
      {/* A popover anchored to the card ran off the side of the battle row, which
          scrolls sideways and clips vertically — on a phone the outer card's menu
          was unreadable. A centered sheet is anchored to the viewport instead, so
          the choice reads the same wherever the permanent sits. */}
      {showEffects && activatable.length > 1 ? (
        <>
          <div
            className="game-effect-scrim"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowEffects(false);
            }}
          />
          <div
            className="game-effect-menu"
            role="menu"
            aria-label={`${t("game.activateEffect")}: ${cardName}`}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="game-effect-menu__title">{cardName}</p>
            {activatable.map((entry) => (
              <button
                key={entry.effectKey}
                className="game-effect-menu__item"
                role="menuitem"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => handleEffectClick(e, entry)}
                title={entry.description}
                aria-label={`${t("game.activateEffect")}: ${entry.description}`}
              >
                <span aria-hidden="true">⚡</span>
                <span className="game-effect-menu__text">{entry.description}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function BreedingSlot({
  perm,
  label,
  candidate,
  compact,
  width,
  onClick,
  drop,
}: {
  perm?: Permanent;
  label: string;
  candidate?: boolean;
  compact?: boolean;
  /** Explicit slot width; overrides the `compact` default. */
  width?: number;
  onClick?: () => void;
  drop?: DropAttrs;
}) {
  const { t } = useTranslation();
  const w = width ?? (compact ? 66 : 100);
  return (
    <div
      className="game-breeding-slot"
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

export function MemoryGauge({
  value,
  yourColor,
  oppColor,
  compact,
}: {
  value: number;
  yourColor: ColorName;
  oppColor: ColorName;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const gaugeLabel = t("game.memoryGauge", { memory: value > 0 ? `+${value}` : `${value}` });
  const ticks: number[] = [];
  for (let v = 10; v >= -10; v -= 1) ticks.push(v);
  const cv = Math.max(-10, Math.min(10, value));
  const yc = COLORS[yourColor];
  // Memory on the opponent's side means the viewer's turn is ending, so that half of
  // the gauge reads as a warning rather than as the opponent's identity colour —
  // which is whatever they picked and carries no urgency (it can even match yours).
  const oc = { base: "var(--ds-danger)", on: "#fff" };
  const oppIdentity = COLORS[oppColor];
  // Each step is a numbered coin, the way the official memory gauge prints it. The
  // coins flex to share whatever width the board gives them and stay circular via
  // `aspect-ratio`, so the gauge can never overflow and force a horizontal scroll.
  const renderCoin = (v: number) => {
    const active = (cv >= 0 && v >= 0 && v <= cv) || (cv < 0 && v <= 0 && v >= cv);
    const isMarker = v === cv;
    const side = v < 0 ? oc : v > 0 ? yc : null;
    const fill = isMarker
      ? cv < 0
        ? oc.base
        : cv > 0
          ? yc.base
          : "var(--ds-foreground)"
      : active
        ? side
          ? side.base
          : "var(--ds-border-strong)"
        : "var(--ds-surface-muted)";
    const ink = isMarker
      ? cv === 0
        ? "var(--ds-background)"
        : cv < 0
          ? oc.on
          : yc.on
      : active
        ? side
          ? side.on
          : "var(--ds-background)"
        : "var(--ds-foreground-disabled)";
    return (
      <div
        key={v}
        className={`game-memory-coin${isMarker ? " game-memory-coin--marker" : ""}${v % 5 === 0 ? " game-memory-coin--five" : ""}`}
        style={{
          background: fill,
          color: ink,
          // A ring in the track's own colour separates the marker from the coins it
          // sits between, which carry the same fill on the active side.
          boxShadow: isMarker
            ? `0 0 0 2px var(--ds-surface), 0 0 0 4px ${fill}, var(--ds-shadow-sm)`
            : "inset 0 -1px 0 rgb(0 0 0 / 18%)",
          border: v === 0 && !isMarker ? "1px solid var(--ds-border-strong)" : "none",
        }}
      >
        <span className="game-memory-coin__n">{isMarker ? (value > 0 ? `+${value}` : value) : Math.abs(v)}</span>
      </div>
    );
  };

  if (compact) {
    return (
      <div
        className="game-memory-gauge game-memory-gauge--compact"
        role="img"
        aria-label={gaugeLabel}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}
      >
        <span
          style={{
            fontFamily: "var(--ds-font-mono)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: cv < 0 ? oc.base : oppIdentity.base,
          }}
        >
          {t("game.opponentShort")}
        </span>
        <div className="game-memory-gauge__track">{ticks.map(renderCoin)}</div>
        <span
          style={{
            fontFamily: "var(--ds-font-mono)",
            fontSize: 12,
            fontWeight: 700,
            color: cv < 0 ? oc.base : yc.base,
            minWidth: 24,
            textAlign: "right",
          }}
        >
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
    );
  }
  // Every part of the gauge shrinks: the labels give way first, then the ticks
  // flex down from their full size. A fixed 986px gauge used to set the whole
  // board's minimum width and push the right-hand pile rail off screen.
  return (
    <div
      className="game-memory-gauge"
      role="img"
      aria-label={gaugeLabel}
      style={{
        display: "flex",
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        padding: "0 30px",
      }}
    >
      <div className="game-memory-gauge__side" style={{ textAlign: "right", flex: "0 1 120px", minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--ds-font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            color: yc.base,
            fontWeight: 700,
          }}
        >
          YOUR MEMORY
        </div>
        <div
          style={{
            fontSize: 13.5,
            color: value >= 0 ? "var(--ds-foreground)" : "var(--ds-foreground-muted)",
            fontWeight: 600,
          }}
        >
          {value >= 0 ? "your turn" : "turn ending…"}
        </div>
      </div>
      <div className="game-memory-gauge__track">{ticks.map(renderCoin)}</div>
      <div className="game-memory-gauge__side" style={{ flex: "0 1 120px", minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--ds-font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            color: "var(--ds-foreground-muted)",
          }}
        >
          OPPONENT
        </div>
        <div style={{ fontSize: 13.5, color: value < 0 ? oc.base : "var(--ds-foreground-muted)", fontWeight: 600 }}>
          {value < 0 ? "active turn" : "waiting"}
        </div>
      </div>
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

export function Hand({
  cards,
  selectedInstanceId,
  startDrag,
  selectCard,
  draggingInstanceId,
  cardWidth = HAND_CARD_WIDTH,
  minExposure = HAND_MIN_EXPOSURE,
}: {
  cards: HandEntry[];
  selectedInstanceId?: string;
  startDrag: (index: number, e: React.PointerEvent) => void;
  selectCard?: (index: number) => void;
  draggingInstanceId?: string;
  cardWidth?: number;
  /** How much of a buried card stays tappable. */
  minExposure?: number;
}) {
  const { t } = useTranslation();
  const n = cards.length;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  const rowWidth = useElementWidth(rowEl);
  // The hand tightens its own fan until it fits the dock. Without this a big hand
  // simply grew past the board and painted over the sidebar.
  const overlap = handOverlap(n, rowWidth, cardWidth, minExposure);
  return (
    <div
      ref={setRowEl}
      data-testid="hand"
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
        const sel = selectedInstanceId === entry.instanceId;
        const dragging = draggingInstanceId === entry.instanceId;
        const hov = hoveredIndex === i;
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
            onPointerDown={(e) => startDrag(i, e)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              selectCard?.(i);
            }}
            onClick={(event) => {
              // Pointer taps are resolved by GameScreen's drag/tap recognizer.
              // A zero-detail click is keyboard/assistive activation and needs a
              // direct deterministic selection path without toggling twice.
              if (event.detail === 0) selectCard?.(i);
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            role="button"
            tabIndex={0}
            aria-label={t("game.selectCard", { card: getCardDefinition(entry.cardId)?.nameEn ?? entry.cardId })}
            aria-pressed={sel}
            style={style}
          >
            <CardFull cardId={entry.cardId} width={cardWidth} selected={sel} />
          </div>
        );
      })}
    </div>
  );
}

export function AttackArrow({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const midX = (from.x + to.x) / 2;
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 60, pointerEvents: "none" }}>
      <defs>
        <marker id="aegis-arrowhead" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--ds-danger)" />
        </marker>
      </defs>
      <path
        d={`M ${from.x} ${from.y} Q ${midX} ${(from.y + to.y) / 2 - 60} ${to.x} ${to.y}`}
        fill="none"
        stroke="var(--ds-danger)"
        strokeWidth={4}
        strokeDasharray="9 7"
        markerEnd="url(#aegis-arrowhead)"
        style={{ animation: "aegis-dash 0.6s linear infinite" }}
      />
    </svg>
  );
}
