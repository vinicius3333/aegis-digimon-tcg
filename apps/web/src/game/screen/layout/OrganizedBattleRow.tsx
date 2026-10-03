/* One side's battle area as two lanes: Digimon, and a smaller lane of grouped Tamers
   and Options. The outer element keeps the row's class, so every breakpoint still
   places and sizes it as the single row it replaces; each lane scrolls on its own. */

import { useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import type { Permanent } from "@aegis/shared";
import { BattleRow, suspendedCardEdgeClearance } from "../../BattleRow";
import { carryGroupKeys, type FieldArrangement, type PreviousPlacement } from "../model/fieldArrangement";
import "../../style/fieldLayout.css";

const CARD_ASPECT = 1.4;
const LANE_GAP = 2;
/** The smallest Digimon stacked lanes shrink to, as a share of the layout's width. */
const MIN_STACKED_SHRINK = 0.6;

/**
 * Stacked puts the support lane under the Digimon (above them for the opponent). A row
 * too short for two lanes, like a phone on its side, puts the lanes side by side.
 */
export enum LanePlacement {
  Stacked = "stacked",
  SideBySide = "side-by-side",
}

interface LaneMetrics {
  /** Support cards as a share of the Digimon width. */
  supportScale: number;
  /** Digimon lane padding: keyword pills above, focus ring below. */
  digimonPadding: { top: number; bottom: number };
  /** Support lane padding: room above for the count chip and the copies peeking out. */
  supportPadding: { top: number; bottom: number };
}

const LANE_METRICS: Record<LanePlacement, LaneMetrics> = {
  [LanePlacement.Stacked]: {
    supportScale: 0.62,
    digimonPadding: { top: 18, bottom: 4 },
    supportPadding: { top: 11, bottom: 3 },
  },
  [LanePlacement.SideBySide]: {
    supportScale: 0.8,
    digimonPadding: { top: 9, bottom: 2 },
    supportPadding: { top: 11, bottom: 2 },
  },
};

export interface OrganizedCard {
  permanent: Permanent;
  /** Every permanent the drawn card stands for, itself included. */
  members: readonly Permanent[];
  width: number;
  /** Stable across renders while the card's copies stay together; also the React key. */
  fieldKey: string;
  /** The card was already on the field inside another group, so it slides out instead of entering. */
  splitOff: boolean;
}

/** How long a card takes to slide to its new place and turn. */
const MOTION_MS = 420;

interface DrawnCard {
  x: number;
  y: number;
  suspended: boolean;
  element: HTMLElement;
}

/** Where a card in flight is drawn, relative to its place in the layout. */
interface FlightOffset {
  x: number;
  y: number;
  angle: number;
}

const STILL: FlightOffset = { x: 0, y: 0, angle: 0 };
const flights = new WeakMap<Element, Animation>();

/** The offset a running slide still applies, read from the computed transform. */
function flightOffset(element: HTMLElement): FlightOffset {
  if (flights.get(element)?.playState !== "running") return STILL;
  const style = getComputedStyle(element);
  const translation = style.translate.split(" ");
  return {
    x: Number.parseFloat(translation[0]!) || 0,
    y: Number.parseFloat(translation[1]!) || 0,
    angle: Number.parseFloat(style.rotate) || 0,
  };
}

/** A card's centre in its lane's scrolled content, so a scroll between two renders is not read as a move. */
function measureCards(row: HTMLElement): Map<string, DrawnCard> {
  const rowRect = row.getBoundingClientRect();
  const drawn = new Map<string, DrawnCard>();
  for (const element of row.querySelectorAll<HTMLElement>("[data-field-key]")) {
    const rect = element.getBoundingClientRect();
    const scroll = element.closest(".game-battle-lane")?.scrollLeft ?? 0;
    drawn.set(element.dataset.fieldKey!, {
      x: rect.left + rect.width / 2 - rowRect.left + scroll,
      y: rect.top + rect.height / 2 - rowRect.top,
      suspended: element.hasAttribute("data-suspended"),
      element,
    });
  }
  return drawn;
}

/**
 * Slides every card from where it was drawn last time to where it is now. A card split
 * off a group starts on that group and, when it was turned on the way out, starts
 * upright too, so it is seen leaving the stack and turning. A card still sliding when
 * the field changes again continues from where it is drawn. A resize only re-measures.
 */
function useFieldMotion(
  rowRef: React.RefObject<HTMLDivElement | null>,
  previous: React.RefObject<PreviousPlacement>,
  cards: readonly OrganizedCard[],
  isSuspended: (permanent: Permanent) => boolean,
  rowSize: { width: number; height: number },
) {
  const drawnBefore = useRef(new Map<string, DrawnCard>());
  const sizeBefore = useRef({ width: 0, height: 0 });
  const signature = JSON.stringify([
    rowSize,
    cards.map((card) => [
      card.fieldKey,
      card.width,
      card.members.map((member) => [member.permanentId, isSuspended(member)]),
    ]),
  ]);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const offsets = new Map<Element, FlightOffset>();
    for (const element of row.querySelectorAll<HTMLElement>("[data-field-key]")) {
      offsets.set(element, flightOffset(element));
      flights.get(element)?.cancel();
    }
    const drawn = measureCards(row);
    const size = { width: row.clientWidth, height: row.clientHeight };
    const resized = size.width !== sizeBefore.current.width || size.height !== sizeBefore.current.height;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!resized && !reduceMotion) {
      for (const card of cards) {
        const now = drawn.get(card.fieldKey);
        if (!now || typeof now.element.animate !== "function") continue;
        const earlierKey = drawnBefore.current.has(card.fieldKey)
          ? card.fieldKey
          : card.members.map((member) => previous.current.get(member.permanentId)?.key).find(Boolean);
        const before = earlierKey ? drawnBefore.current.get(earlierKey) : undefined;
        if (!before) continue;
        const offset = offsets.get(before.element) ?? STILL;
        const dx = before.x + offset.x - now.x;
        const dy = before.y + offset.y - now.y;
        // A card that kept its element turns through its own transition; a new one must be turned here.
        const turn =
          before.element !== now.element && before.suspended !== now.suspended ? (now.suspended ? -90 : 90) : 0;
        const angle = (before.element === now.element ? offset.angle : 0) + turn;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(angle) < 1) continue;
        const flight = now.element.animate(
          [
            { translate: `${dx}px ${dy}px`, rotate: `${angle}deg` },
            { translate: "0px 0px", rotate: "0deg" },
          ],
          {
            duration: MOTION_MS,
            fill: "both",
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          },
        );
        // The document timeline can lag behind input in background browser tabs.
        // Use the current document clock and hold the origin until its next paint.
        flight.startTime = performance.now();
        flights.set(now.element, flight);
      }
    }
    drawnBefore.current = drawn;
    sizeBefore.current = size;
    previous.current = new Map(
      cards.flatMap((card) =>
        card.members.map(
          (member) => [member.permanentId, { key: card.fieldKey, suspended: isSuspended(member) }] as const,
        ),
      ),
    );
  }, [rowRef, previous, signature]);
}

interface LaneLayout {
  placement: LanePlacement;
  digimon: number;
  support: number;
}

interface LaneContent {
  digimonCount: number;
  supportCount: number;
}

/** Stacked widths, or undefined when stacking would shrink the Digimon past the floor. */
function stackedLanes(rowHeight: number, layoutWidth: number): LaneLayout | undefined {
  const { supportScale, digimonPadding, supportPadding } = LANE_METRICS[LanePlacement.Stacked];
  const padding = digimonPadding.top + digimonPadding.bottom + supportPadding.top + supportPadding.bottom;
  const fitted = (rowHeight - padding - LANE_GAP) / (CARD_ASPECT * (1 + supportScale));
  if (fitted < layoutWidth * MIN_STACKED_SHRINK) return undefined;
  const digimon = Math.round(Math.min(layoutWidth, fitted));
  return { placement: LanePlacement.Stacked, digimon, support: Math.round(digimon * supportScale) };
}

function sideBySideLanes(rowHeight: number, layoutWidth: number): LaneLayout {
  const { supportScale, digimonPadding, supportPadding } = LANE_METRICS[LanePlacement.SideBySide];
  const digimonHeight = rowHeight - digimonPadding.top - digimonPadding.bottom;
  const supportHeight = rowHeight - supportPadding.top - supportPadding.bottom;
  const digimon = Math.round(Math.min(layoutWidth, digimonHeight / CARD_ASPECT));
  const support = Math.round(Math.min(digimon * supportScale, supportHeight / CARD_ASPECT));
  return { placement: LanePlacement.SideBySide, digimon, support };
}

/**
 * Card widths that fit both lanes in the box the breakpoint gives the row. The layout's
 * width is the ceiling. Placement depends on available height, so splitting or
 * merging copies cannot flip the lanes or change every Digimon's size.
 */
export function fitLanes(
  row: { width: number; height: number },
  layoutWidth: number,
  content: LaneContent,
): LaneLayout {
  if (content.supportCount === 0 || row.height <= 0) {
    return {
      placement: LanePlacement.Stacked,
      digimon: layoutWidth,
      support: Math.round(layoutWidth * LANE_METRICS[LanePlacement.Stacked].supportScale),
    };
  }
  const stacked = stackedLanes(row.height, layoutWidth);
  return stacked ?? sideBySideLanes(row.height, layoutWidth);
}

function useRowSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const measure = () =>
      setSize((previous) =>
        previous.width === row.clientWidth && previous.height === row.clientHeight
          ? previous
          : { width: row.clientWidth, height: row.clientHeight },
      );
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

export function OrganizedBattleRow({
  arrangement,
  layoutWidth,
  supportFirst,
  digimonLabel,
  supportLabel,
  emptyLabel,
  renderCard,
  rowProps,
  isSuspended,
}: {
  arrangement: FieldArrangement;
  layoutWidth: number;
  /** The opponent's support lane sits toward their edge of the table, above their Digimon. */
  supportFirst: boolean;
  digimonLabel: string;
  supportLabel: string;
  emptyLabel: ReactNode;
  renderCard: (card: OrganizedCard) => ReactNode;
  rowProps: HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | undefined>;
  isSuspended: (permanent: Permanent) => boolean;
}) {
  const { ref, size } = useRowSize();
  const previous = useRef<PreviousPlacement>(new Map());
  // A card stays split-off for as long as it is drawn: dropping the flag on a later
  // render would restart the entrance animation it skipped.
  const splitKeys = useRef(new Set<string>());
  const keysBefore = new Set([...previous.current.values()].map((placement) => placement.key));
  const card = (members: readonly Permanent[], fieldKey: string, width: number): OrganizedCard => ({
    permanent: members[0]!,
    members,
    width,
    fieldKey,
    splitOff:
      splitKeys.current.has(fieldKey) ||
      (!keysBefore.has(fieldKey) && members.some((member) => previous.current.has(member.permanentId))),
  });
  const hasSupport = arrangement.support.length > 0;
  const lanes = fitLanes(size, layoutWidth, {
    digimonCount: arrangement.digimon.length,
    supportCount: arrangement.support.length,
  });
  const metrics = LANE_METRICS[lanes.placement];
  const digimonCards = arrangement.digimon.map((permanent) => card([permanent], permanent.permanentId, lanes.digimon));
  const supportCards = carryGroupKeys(arrangement.support, previous.current, isSuspended).map((group) =>
    card(group.members, group.key, lanes.support),
  );
  const cards = [...digimonCards, ...supportCards];
  useFieldMotion(ref, previous, cards, isSuspended, size);
  useLayoutEffect(() => {
    splitKeys.current = new Set(cards.filter((drawn) => drawn.splitOff).map((drawn) => drawn.fieldKey));
  });

  const digimonLane = (
    <BattleRow
      key="digimon"
      className="game-battle-row game-battle-lane game-battle-lane--digimon"
      role="group"
      aria-label={digimonLabel}
      edgeClearance={suspendedCardEdgeClearance(lanes.digimon)}
      style={{
        flex: lanes.placement === LanePlacement.Stacked ? "1 1 auto" : "0 1 auto",
        minHeight: 0,
        display: "flex",
        gap: Math.round(lanes.digimon * 0.2),
        justifyContent: "safe center",
        alignItems: "center",
        padding: `${metrics.digimonPadding.top}px 12px ${metrics.digimonPadding.bottom}px`,
      }}
    >
      {arrangement.digimon.length === 0 && !hasSupport ? emptyLabel : null}
      {digimonCards.map(renderCard)}
    </BattleRow>
  );

  const supportLane = hasSupport ? (
    <BattleRow
      key="support"
      className="game-battle-row game-battle-lane game-battle-lane--support"
      role="group"
      aria-label={supportLabel}
      edgeClearance={suspendedCardEdgeClearance(lanes.support)}
      style={{
        flex: "0 1 auto",
        display: "flex",
        gap: Math.round(lanes.support * 0.3),
        justifyContent: "safe center",
        alignItems: "center",
        padding: `${metrics.supportPadding.top}px 12px ${metrics.supportPadding.bottom}px`,
      }}
    >
      {supportCards.map(renderCard)}
    </BattleRow>
  ) : null;

  return (
    <div
      {...rowProps}
      ref={ref}
      data-field-layout="organized"
      data-lanes={lanes.placement}
      style={{ ...rowProps.style, gap: LANE_GAP }}
    >
      {supportFirst ? [supportLane, digimonLane] : [digimonLane, supportLane]}
    </div>
  );
}
