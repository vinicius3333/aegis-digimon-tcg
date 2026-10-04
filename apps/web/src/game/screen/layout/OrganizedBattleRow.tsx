/* One side's battle area as two lanes: Digimon, and a smaller lane of grouped Tamers
   and Options. The outer element keeps the row's class, so every breakpoint still
   places and sizes it as the single row it replaces; each lane scrolls on its own. */

import { useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import type { Permanent } from "@aegis/shared";
import { BattleRow, suspendedCardEdgeClearance } from "../../BattleRow";
import { carryGroupKeys, type FieldArrangement, type PreviousPlacement } from "../model/fieldArrangement";
import "../../style/fieldLayout.css";
import { linkCardOverhang, linkCardSlots, sourceFanStepLimit } from "../../boardModel";
import { COPY_EDGE_STEP, copyEdgeCount } from "../../piece/PermanentCopies";
import { reportFieldCardWidth, useFieldCardWidth } from "./fieldCardWidth";

const CARD_ASPECT = 1.4;
/** The design's --ds-touch-target minimum also applies to each permanent's button wrapper. */
const MIN_PERMANENT_HEIGHT = 44;
const LANE_GAP = 0;
/** The smallest Digimon stacked lanes shrink to, as a share of the layout's width. */
const MIN_STACKED_SHRINK = 0.6;
/** A crowded lane shrinks its cards to this share of the height-fitted width before it scrolls. */
const MIN_WIDTH_SHRINK = 0.75;
/** Each lane's horizontal padding, from fieldLayout.css. */
const LANE_INLINE_PADDING = 12;
const DIGIMON_GAP_SHARE = 0.25;
const SUPPORT_GAP_SHARE = 0.3;

/**
 * Stacked puts the support lane under the Digimon (above them for the opponent). A row
 * too short for two lanes, like a phone on its side, puts the lanes side by side. An
 * upright phone too short to stack merges both into one lane, Digimon first.
 */
export enum LanePlacement {
  Stacked = "stacked",
  SideBySide = "side-by-side",
  Merged = "merged",
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
  [LanePlacement.Merged]: {
    supportScale: 1,
    digimonPadding: { top: 9, bottom: 2 },
    supportPadding: { top: 9, bottom: 2 },
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
const artFlights = new WeakMap<HTMLElement, { animation: Animation; suspended: boolean }>();

function turnArtwork(art: HTMLElement, from: number, suspended: boolean) {
  artFlights.get(art)?.animation.cancel();
  const animation = art.animate([{ rotate: `${from}deg` }, { rotate: suspended ? "90deg" : "0deg" }], {
    duration: MOTION_MS,
    fill: "backwards",
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  });
  artFlights.set(art, { animation, suspended });
}

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
      const art = element.querySelector<HTMLElement>(".game-card-enter > [data-state]");
      const turn = art ? artFlights.get(art) : undefined;
      const suspended = element.hasAttribute("data-suspended");
      if (art && turn && turn.suspended !== suspended) {
        turnArtwork(art, Number.parseFloat(getComputedStyle(art).rotate) || 0, suspended);
      }
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
        // Turn only the art. Rotating the whole touch frame would sweep badges
        // and its empty corners outside the lane when a copy splits off.
        if (before.element !== now.element && before.suspended !== now.suspended) {
          const art = now.element.querySelector<HTMLElement>(".game-card-enter > [data-state]");
          if (art) turnArtwork(art, before.suspended ? 90 : 0, now.suspended);
        }
        const angle = before.element === now.element ? offset.angle : 0;
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

export interface LaneLayout {
  placement: LanePlacement;
  digimon: number;
  support: number;
}

interface LaneContent {
  digimonCount: number;
  supportCount: number;
  digimonSources?: number;
  supportSources?: number;
  digimonLinks?: number;
  supportLinks?: number;
  sourceTop?: number;
  sourceStep?: number;
  preferStacked?: boolean;
  /** Overrides the stacked support lane's share of the Digimon width. */
  supportScale?: number;
  /** Size the cards as if both lanes were full, so playing the first Tamer changes nothing. */
  reserveSupport?: boolean;
  /** Stacked lanes share the clearance between them: one lane's suspension sweep and the other's badge strip. */
  overlapLanes?: boolean;
  /** Shrink crowded lanes' cards, down to a floor, before they scroll. */
  fitWidth?: boolean;
}

/** What a card adds to its lane's width beyond the card itself. */
export interface LaneCard {
  suspended: boolean;
  sources: number;
  links: number;
  copies: number;
}

function laneGap(width: number, preferStacked: boolean, share: number): number {
  return Math.max(preferStacked ? 20 : 12, Math.round(width * share));
}

/** Room at each end of a lane for a card turning sideways or its source fan. */
function laneEdge(width: number, sources: number, sourceStep: number): number {
  return Math.max(
    suspendedCardEdgeClearance(width),
    sources ? 12 + (sources - 1) * Math.min(sourceStep, sourceFanStepLimit(width, sources)) : 22,
  );
}

/** A lane's scroll width at a card width, matching PermanentView's inline margins. */
export function laneContentWidth(
  cards: readonly LaneCard[],
  width: number,
  gapShare: number,
  sourceStep: number,
  preferStacked = false,
): number {
  if (cards.length === 0) return 0;
  const suspendedMargin = Math.ceil(width * 0.2);
  const frames = cards.reduce((total, card) => {
    const turn = card.suspended ? suspendedMargin : 0;
    const start = card.sources
      ? Math.max(turn, 4 + (card.sources - 1) * Math.min(sourceStep, sourceFanStepLimit(width, card.sources)))
      : turn;
    const end = turn + linkCardOverhang(card.links, width) + copyEdgeCount(card.copies) * COPY_EDGE_STEP;
    return total + Math.max(MIN_PERMANENT_HEIGHT, width) + start + end;
  }, 0);
  const sources = Math.max(...cards.map((card) => card.sources));
  // The lane's flex gap also separates each end's turn clearance from the cards.
  return (
    frames +
    (cards.length + 1) * laneGap(width, preferStacked, gapShare) +
    2 * laneEdge(width, sources, sourceStep) +
    2 * LANE_INLINE_PADDING
  );
}

/**
 * Narrows lanes whose cards overflow the row's width, down to a floor. Past the
 * floor the lanes scroll rather than shrink cards past reading. Side-by-side lanes
 * share the row's width, so their widths add up.
 */
export function fitLanesToWidth(
  lanes: LaneLayout,
  rowWidth: number,
  cards: { digimon: readonly LaneCard[]; support: readonly LaneCard[] },
  content: LaneContent,
): LaneLayout {
  if (!content.fitWidth || rowWidth <= 0) return lanes;
  const scale = content.supportScale ?? LANE_METRICS[lanes.placement].supportScale;
  const supportFor = (width: number) => Math.max(22, Math.floor(width * scale));
  const step = content.sourceStep ?? 4;
  const preferStacked = content.preferStacked ?? false;
  const digimonWidth = (width: number) =>
    laneContentWidth(cards.digimon, width, DIGIMON_GAP_SHARE, step, preferStacked);
  const supportWidth = (width: number) =>
    laneContentWidth(cards.support, supportFor(width), SUPPORT_GAP_SHARE, step, preferStacked);
  const fits = {
    [LanePlacement.Stacked]: (width: number) => digimonWidth(width) <= rowWidth && supportWidth(width) <= rowWidth,
    [LanePlacement.SideBySide]: (width: number) => digimonWidth(width) + supportWidth(width) <= rowWidth,
    [LanePlacement.Merged]: (width: number) =>
      laneContentWidth([...cards.digimon, ...cards.support], width, DIGIMON_GAP_SHARE, step, preferStacked) <= rowWidth,
  }[lanes.placement];
  if (fits(lanes.digimon)) return lanes;
  const digimon = Math.max(Math.ceil(lanes.digimon * MIN_WIDTH_SHRINK), fittedWidth(lanes.digimon, fits));
  return { ...lanes, digimon, support: supportFor(digimon) };
}

function laneMetrics(placement: LanePlacement, content: LaneContent, widths = { digimon: 0, support: 0 }): LaneMetrics {
  const base = LANE_METRICS[placement];
  const shadow = content.preferStacked ? 8 : 10;
  const top = content.preferStacked ? 18 : 22;
  const sourceBottom = (count = 0, width: number) =>
    count
      ? (content.sourceTop ?? 6) +
        (count - 1) * Math.min(content.sourceStep ?? 4, sourceFanStepLimit(width, count)) +
        shadow
      : shadow;
  const bottom = (sources: number | undefined, links = 0, width: number) => {
    const artworkHeight = Math.ceil(width * CARD_ASPECT);
    const frameHeight = Math.max(MIN_PERMANENT_HEIGHT, artworkHeight);
    // A small card's sources can use the otherwise empty part of its touch target.
    return Math.max(
      shadow,
      // The card's diagonal is its tallest extent halfway through suspension.
      Math.ceil((Math.hypot(width, artworkHeight) - frameHeight) / 2) + shadow,
      sourceBottom(sources, width) - (frameHeight - artworkHeight),
      ...linkCardSlots(links, width).map((slot) => slot.top + slot.height - frameHeight + shadow),
    );
  };
  return {
    ...base,
    digimonPadding: { top, bottom: bottom(content.digimonSources, content.digimonLinks, widths.digimon) },
    supportPadding: { top, bottom: bottom(content.supportSources, content.supportLinks, widths.support) },
  };
}

/**
 * How far stacked lanes may overlap. The facing lane's clearance below its cards only
 * holds a card mid-turn, never at rest, so it can share space with the next lane's
 * badge strip. The contact shadow stays clear.
 */
function laneOverlap(placement: LanePlacement, content: LaneContent, metrics: LaneMetrics): number {
  if (!content.overlapLanes || placement !== LanePlacement.Stacked) return 0;
  const shadow = content.preferStacked ? 8 : 10;
  const clearance = Math.min(metrics.digimonPadding.bottom, metrics.supportPadding.bottom) - shadow;
  return Math.max(0, Math.min(metrics.digimonPadding.top, metrics.supportPadding.top, clearance));
}

/** Largest integral width whose complete painted lane fits. */
function fittedWidth(ceiling: number, fits: (width: number) => boolean): number {
  let low = 1;
  let high = Math.floor(ceiling);
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fits(mid)) low = mid;
    else high = mid - 1;
  }
  return low;
}
function laneHeight(width: number, padding: { top: number; bottom: number }) {
  return Math.max(MIN_PERMANENT_HEIGHT, Math.ceil(width * CARD_ASPECT)) + padding.top + padding.bottom;
}

/** Stacked widths, or undefined when stacking would shrink the Digimon past the floor. */
function stackedLanes(rowHeight: number, layoutWidth: number, content: LaneContent): LaneLayout | undefined {
  const supportScale = content.supportScale ?? LANE_METRICS[LanePlacement.Stacked].supportScale;
  const supportWidth = (width: number) => Math.max(22, Math.floor(width * supportScale));
  const digimon = fittedWidth(layoutWidth, (width) => {
    const support = supportWidth(width);
    const metrics = laneMetrics(LanePlacement.Stacked, content, { digimon: width, support });
    return (
      laneHeight(width, metrics.digimonPadding) +
        laneHeight(support, metrics.supportPadding) +
        LANE_GAP -
        laneOverlap(LanePlacement.Stacked, content, metrics) <=
      rowHeight
    );
  });
  if (digimon < (content.preferStacked ? 44 : layoutWidth * MIN_STACKED_SHRINK)) return undefined;
  return { placement: LanePlacement.Stacked, digimon, support: supportWidth(digimon) };
}

/** A merged lane holds both kinds of card, so it clears the larger source fan and links. */
function mergedContent(content: LaneContent): LaneContent {
  return {
    ...content,
    digimonSources: Math.max(content.digimonSources ?? 0, content.supportSources ?? 0),
    digimonLinks: Math.max(content.digimonLinks ?? 0, content.supportLinks ?? 0),
  };
}

/** One lane at the row's full height; support cards match the Digimon. */
function mergedLanes(rowHeight: number, layoutWidth: number, content: LaneContent): LaneLayout {
  const placement = LanePlacement.Merged;
  const merged = mergedContent(content);
  const digimon = fittedWidth(
    layoutWidth,
    (width) =>
      laneHeight(width, laneMetrics(placement, merged, { digimon: width, support: 0 }).digimonPadding) <= rowHeight,
  );
  return { placement, digimon, support: digimon };
}

function sideBySideLanes(rowHeight: number, layoutWidth: number, content: LaneContent): LaneLayout {
  const placement = LanePlacement.SideBySide;
  const digimon = fittedWidth(
    layoutWidth,
    (width) =>
      laneHeight(width, laneMetrics(placement, content, { digimon: width, support: 0 }).digimonPadding) <= rowHeight,
  );
  const support = fittedWidth(
    Math.max(22, digimon * (content.supportScale ?? LANE_METRICS[placement].supportScale)),
    (width) =>
      laneHeight(width, laneMetrics(placement, content, { digimon, support: width }).supportPadding) <= rowHeight,
  );
  return { placement, digimon, support };
}

/**
 * Card widths that fit both lanes in the box the breakpoint gives the row. The layout's
 * width is the ceiling. Placement depends on available height, so splitting or
 * merging copies cannot flip the lanes or change every Digimon's size.
 */
export function fitLanes(row: { width: number; height: number }, layoutWidth: number, drawn: LaneContent): LaneLayout {
  const content = drawn.reserveSupport
    ? { ...drawn, digimonCount: Math.max(1, drawn.digimonCount), supportCount: Math.max(1, drawn.supportCount) }
    : drawn;
  if (row.height <= 0) {
    return {
      placement: LanePlacement.Stacked,
      digimon: layoutWidth,
      support: Math.round(layoutWidth * LANE_METRICS[LanePlacement.Stacked].supportScale),
    };
  }
  if (content.supportCount === 0 || content.digimonCount === 0) {
    const placement = LanePlacement.Stacked;
    const digimon = fittedWidth(
      layoutWidth,
      (width) =>
        laneHeight(width, laneMetrics(placement, content, { digimon: width, support: 0 }).digimonPadding) <= row.height,
    );
    const support = fittedWidth(
      content.preferStacked ? 56 : layoutWidth * (content.supportScale ?? LANE_METRICS[placement].supportScale),
      (width) =>
        laneHeight(width, laneMetrics(placement, content, { digimon: 0, support: width }).supportPadding) <= row.height,
    );
    return { placement, digimon, support };
  }
  const stacked = stackedLanes(row.height, layoutWidth, content);
  if (stacked) return stacked;
  return content.preferStacked
    ? mergedLanes(row.height, layoutWidth, content)
    : sideBySideLanes(row.height, layoutWidth, content);
}

function useRowSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: 0,
    height: 0,
    sourceTop: 6,
    sourceStep: 4,
    preferStacked: false,
    supportScale: undefined as number | undefined,
    reserveSupport: false,
    overlapLanes: false,
    fitWidth: false,
  });
  function measure() {
    const row = ref.current;
    if (!row) return;
    const style = getComputedStyle(row);
    const sourceTop = Number.parseFloat(style.getPropertyValue("--arena-source-top")) || 6;
    const sourceStep = Number.parseFloat(style.getPropertyValue("--arena-source-step")) || 4;
    const preferStacked = style.getPropertyValue("--field-prefer-stacked").trim() === "1";
    const supportScale = Number.parseFloat(style.getPropertyValue("--field-support-scale")) || undefined;
    const reserveSupport = style.getPropertyValue("--field-reserve-support").trim() === "1";
    const overlapLanes = style.getPropertyValue("--field-overlap-lanes").trim() === "1";
    const fitWidth = style.getPropertyValue("--field-fit-width").trim() === "1";
    setSize((previous) =>
      previous.width === row.clientWidth &&
      previous.height === row.clientHeight &&
      previous.sourceTop === sourceTop &&
      previous.sourceStep === sourceStep &&
      previous.preferStacked === preferStacked &&
      previous.supportScale === supportScale &&
      previous.reserveSupport === reserveSupport &&
      previous.overlapLanes === overlapLanes &&
      previous.fitWidth === fitWidth
        ? previous
        : {
            width: row.clientWidth,
            height: row.clientHeight,
            sourceTop,
            sourceStep,
            preferStacked,
            supportScale,
            reserveSupport,
            overlapLanes,
            fitWidth,
          },
    );
  }
  // Media-query renders can precede ResizeObserver delivery, especially in background tabs.
  useLayoutEffect(measure);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(row);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
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
  const content = {
    digimonCount: arrangement.digimon.length,
    supportCount: arrangement.support.length,
    digimonSources: Math.max(0, ...arrangement.digimon.map((permanent) => permanent.stack.length)),
    supportSources: Math.max(
      0,
      ...arrangement.support.flatMap((group) => group.members.map((permanent) => permanent.stack.length)),
    ),
    digimonLinks: Math.max(0, ...arrangement.digimon.map((permanent) => permanent.linked.length)),
    supportLinks: Math.max(
      0,
      ...arrangement.support.flatMap((group) => group.members.map((permanent) => permanent.linked.length)),
    ),
    sourceTop: size.sourceTop,
    sourceStep: size.sourceStep,
    preferStacked: size.preferStacked,
    supportScale: size.supportScale,
    reserveSupport: size.reserveSupport,
    overlapLanes: size.overlapLanes,
    fitWidth: size.fitWidth,
  };
  const laneCard = (members: readonly Permanent[]): LaneCard => ({
    suspended: isSuspended(members[0]!),
    sources: members[0]!.stack.length,
    links: members[0]!.linked.length,
    copies: members.length,
  });
  const heightFitted = fitLanes(size, layoutWidth, content);
  const ownLanes = fitLanesToWidth(
    heightFitted,
    size.width,
    {
      digimon: arrangement.digimon.map((permanent) => laneCard([permanent])),
      support: arrangement.support.map((group) => laneCard(group.members)),
    },
    content,
  );
  const rowKey = useId();
  const reports = size.reserveSupport && size.height > 0;
  const reportedHeightFitted = reports ? heightFitted.digimon : undefined;
  const reportedWidth = reports ? ownLanes.digimon : undefined;
  useEffect(
    () =>
      reportFieldCardWidth(
        rowKey,
        reportedHeightFitted === undefined || reportedWidth === undefined
          ? undefined
          : { heightFitted: reportedHeightFitted, drawn: reportedWidth },
      ),
    [rowKey, reportedHeightFitted, reportedWidth],
  );
  useEffect(() => () => reportFieldCardWidth(rowKey, undefined), [rowKey]);
  // Rows sharing one card size follow the narrowest of them.
  const sharedWidth = useFieldCardWidth()?.drawn;
  const lanes =
    reportedWidth !== undefined && sharedWidth !== undefined && sharedWidth < ownLanes.digimon
      ? {
          ...ownLanes,
          digimon: sharedWidth,
          support: Math.round(sharedWidth * (ownLanes.support / ownLanes.digimon)),
        }
      : ownLanes;
  const merged = lanes.placement === LanePlacement.Merged;
  const metrics = laneMetrics(lanes.placement, merged ? mergedContent(content) : content, lanes);
  const edge = (width: number, sources: number) => laneEdge(width, sources, size.sourceStep);
  const digimonCards = arrangement.digimon.map((permanent) => card([permanent], permanent.permanentId, lanes.digimon));
  const supportCards = carryGroupKeys(arrangement.support, previous.current, isSuspended).map((group) =>
    card(group.members, group.key, lanes.support),
  );
  const cards = [...digimonCards, ...supportCards];
  useFieldMotion(ref, previous, cards, isSuspended, size);
  useLayoutEffect(() => {
    splitKeys.current = new Set(cards.filter((drawn) => drawn.splitOff).map((drawn) => drawn.fieldKey));
  });

  // A reserved Digimon lane stays drawn while empty, so the support lane never moves into it.
  const keepsDigimonSlot = content.reserveSupport && lanes.placement === LanePlacement.Stacked;
  const digimonLane = (
    <BattleRow
      key="digimon"
      className="game-battle-row game-battle-lane game-battle-lane--digimon"
      role="group"
      aria-label={digimonLabel}
      edgeClearance={edge(
        lanes.digimon,
        merged ? Math.max(content.digimonSources, content.supportSources) : content.digimonSources,
      )}
      style={{
        flex: "0 1 auto",
        minHeight: keepsDigimonSlot ? laneHeight(lanes.digimon, metrics.digimonPadding) : 0,
        display: "flex",
        gap: laneGap(lanes.digimon, size.preferStacked, DIGIMON_GAP_SHARE),
        justifyContent: "safe center",
        alignItems: "center",
        ...({
          "--field-lane-top": `${metrics.digimonPadding.top}px`,
          "--field-lane-bottom": `${metrics.digimonPadding.bottom}px`,
        } as React.CSSProperties),
      }}
    >
      {arrangement.digimon.length === 0 && !hasSupport ? emptyLabel : null}
      {digimonCards.map(renderCard)}
      {merged ? supportCards.map(renderCard) : null}
    </BattleRow>
  );

  const showsDigimonLane = merged || content.digimonCount > 0 || !hasSupport || keepsDigimonSlot;
  const supportLane =
    hasSupport && !merged ? (
      <BattleRow
        key="support"
        className="game-battle-row game-battle-lane game-battle-lane--support"
        role="group"
        aria-label={supportLabel}
        edgeClearance={edge(lanes.support, content.supportSources)}
        style={{
          flex: "0 1 auto",
          display: "flex",
          gap: laneGap(lanes.support, size.preferStacked, SUPPORT_GAP_SHARE),
          justifyContent: "safe center",
          alignItems: "center",
          ...({
            "--field-lane-top": `${metrics.supportPadding.top}px`,
            "--field-lane-bottom": `${metrics.supportPadding.bottom}px`,
          } as React.CSSProperties),
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
      style={{
        ...rowProps.style,
        gap: LANE_GAP,
        ...({
          "--field-lane-overlap": `${hasSupport ? laneOverlap(lanes.placement, content, metrics) : 0}px`,
        } as React.CSSProperties),
      }}
    >
      {supportFirst && !size.preferStacked
        ? [supportLane, showsDigimonLane ? digimonLane : null]
        : [showsDigimonLane ? digimonLane : null, supportLane]}
    </div>
  );
}
