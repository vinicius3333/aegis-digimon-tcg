import { useState } from "react";
import { getCardDefinition } from "@aegis/shared";
import { CardFull } from "../../design/cards";
import { TOUCH_LAYOUT_QUERY, useMediaQuery } from "../../design/useMediaQuery";
import { useTranslation } from "../../i18n";
import { useEnterAnimation } from "../animations";
import { HAND_CARD_WIDTH } from "./constants";
import { computeHandCardLayout } from "./handCardLayout";
import { buildHandCopyLabels } from "./handCopyLabels";
import {
  HAND_FAN_ROOM,
  HAND_MIN_EXPOSURE,
  HAND_TILT_BLEED,
  HAND_TOUCH_GAP,
  handOverlap,
  handRowHeight,
} from "./handLayout";
import { HandScrollCue } from "./HandScrollCue";
import type { HandEntry, HandSelection } from "./types";
import { useElementWidth } from "./useElementWidth";
import { useHandPickGesture } from "./useHandPickGesture";
import { useScrollOverflow } from "./useScrollOverflow";

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
  // The strip only scrolls on the touch layout; everywhere else the fan is whole
  // and the cues would point at nothing.
  const touchLayout = useMediaQuery(TOUCH_LAYOUT_QUERY);
  const overflow = useScrollOverflow(touchLayout ? rowEl : null, n);
  const scrollByCard = (direction: -1 | 1) => {
    if (!rowEl) return;
    const step = direction * (cardWidth + HAND_TOUCH_GAP);
    if (typeof rowEl.scrollBy === "function") rowEl.scrollBy({ left: step, behavior: "smooth" });
    else rowEl.scrollLeft += step;
  };
  const copyLabels = buildHandCopyLabels(cards, selection, t);
  // The hand tightens its own fan until it fits the dock. Without this a big hand
  // simply grew past the board and painted over the sidebar.
  const overlap = handOverlap(n, rowWidth, cardWidth, minExposure);
  const handOverflows = rowWidth > 0 && n * cardWidth - overlap * Math.max(0, n - 1) > rowWidth - HAND_TILT_BLEED * 2;
  const { pointerPicked, tapSelection, beginPick, finishPick, cancelPick } = useHandPickGesture(selection);
  return (
    <div className="game-hand-scroller">
      <div
        ref={setRowEl}
        data-testid="hand"
        data-hand-overflow={handOverflows ? "true" : undefined}
        className={selection ? "game-hand game-hand--selecting" : "game-hand"}
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
          const pickPosition = selection ? selection.pickedInstanceIds.indexOf(entry.instanceId) : -1;
          const picked = pickPosition !== -1;
          const pickable = selection?.selectableInstanceIds.includes(entry.instanceId) ?? false;
          const sel = selection ? picked : selectedInstanceId === entry.instanceId;
          const dragging = draggingInstanceId === entry.instanceId;
          const hov = hoveredIndex === i;
          const playable = selection
            ? pickable
            : entry.playableFromHand || entry.digivolveTargetPermanentIds.length > 0;
          const style = computeHandCardLayout({
            index: i,
            count: n,
            overlap,
            handOverflows,
            selected: sel,
            hovered: hov,
            dragging,
          });
          return (
            <div
              key={entry.instanceId}
              onPointerDown={selection ? (e) => beginPick(entry.instanceId, e) : (e) => startDrag(i, e)}
              onPointerUp={selection ? (e) => finishPick(entry.instanceId, e) : undefined}
              onPointerCancel={selection ? cancelPick : undefined}
              onKeyDown={(event) => {
                if (selection?.onInspect && event.key === "Enter" && event.altKey) {
                  event.preventDefault();
                  selection.onInspect(entry.instanceId);
                  return;
                }
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
                  if (event.detail === 0) {
                    if (pickable) selection.onToggle(entry.instanceId);
                  } else tapSelection(entry.instanceId);
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
                selection && pickable && !picked ? "game-hand-card--pickable" : "",
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
              <CardFull
                cardId={entry.cardId}
                artId={entry.artId}
                width={cardWidth}
                selected={sel}
                zoomOnHover={false}
              />
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
      {touchLayout && overflow.start ? <HandScrollCue direction="start" onClick={() => scrollByCard(-1)} /> : null}
      {touchLayout && overflow.end ? <HandScrollCue direction="end" onClick={() => scrollByCard(1)} /> : null}
    </div>
  );
}
