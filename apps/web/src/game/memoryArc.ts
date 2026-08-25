/* The red arc the reference client traces over the memory gauge when memory
   jumps: it leaves the chip the value came from, rises over the chips in
   between, and lands on the chip it moved to.

   The gauge is 21 equal chips (+10 down to −10) sharing one track, so a chip
   centre is a percentage of the track's width and nothing here needs to measure
   the DOM. The arc is drawn in a 100×100 box stretched over the track, which is
   why the path is expressed in the same percentage units. */

/** The gauge runs from +10 to −10 inclusive. */
export const MEMORY_MIN = -10;
export const MEMORY_MAX = 10;
export const MEMORY_CELL_COUNT = MEMORY_MAX - MEMORY_MIN + 1;

/** A single step is already told by the marker pop; only a real jump earns the arc. */
export const MEMORY_ARC_MIN_CELLS = 2;

/** Where the arc's ends sit, and how high it may rise, in the 100×100 draw box. */
/** The ends sit just under the middle of a chip; the arc rises over the chips between them. */
const ARC_BASE_Y = 60;
const ARC_MIN_PEAK_Y = 4;
const ARC_PEAK_BASE = 12;
const ARC_PEAK_PER_CELL = 4;

/**
 * How high the prediction rises as a share of the arc a real change of the same
 * size would draw. Under 1, so the prediction always nests inside the real arc
 * and the two stay legible together.
 */
const PREDICTION_PEAK_SHARE = 0.8;

/** The gauge value clamped to the chips that exist. */
export function clampMemory(value: number): number {
  return Math.max(MEMORY_MIN, Math.min(MEMORY_MAX, value));
}

/** Which chip a memory value lights, counted from the +10 end. */
export function memoryCellIndex(value: number): number {
  return MEMORY_MAX - clampMemory(value);
}

/**
 * The centre of a chip, as a fraction of the row of chips. The chips share the
 * row evenly, except the marker, which is a quarter wider so its own value stays
 * legible — so a traced end lands within a few pixels of its chip rather than
 * dead centre on it.
 */
export function memoryCellCenterFraction(value: number): number {
  return (memoryCellIndex(value) + 0.5) / MEMORY_CELL_COUNT;
}

/** The same centre, as a percentage — the units the arc path is drawn in. */
export function memoryCellCenterPercent(value: number): number {
  return memoryCellCenterFraction(value) * 100;
}

/** How many chips a change travelled across. */
export function memoryCellDistance(from: number, to: number): number {
  return Math.abs(memoryCellIndex(to) - memoryCellIndex(from));
}

/** Whether a change moved far enough to be worth tracing. */
export function shouldDrawMemoryArc(from: number, to: number): boolean {
  return memoryCellDistance(from, to) >= MEMORY_ARC_MIN_CELLS;
}

/**
 * Where memory would land if the held card were played for `cost`, clamped to the
 * chips that exist. A prediction, not a ruling: `cost` is the server's own
 * `projectedPlayCost`, which has every ACTIVE CONTINUOUS reducer applied but cannot
 * include a [BeforePayCost] reduction — resolving one means prompting the player and
 * mutating the board — so it is an upper bound. It gates nothing: the dashed line is
 * decoration over the same gauge the real value keeps drawing.
 */
export function predictedMemory(current: number, cost: number): number {
  return clampMemory(current - cost);
}

/** A prediction is worth drawing only when it would actually move the marker. */
export function shouldDrawMemoryPrediction(from: number, to: number): boolean {
  return memoryCellDistance(from, to) >= 1;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The arc as an SVG path, in the 100×100 box the gauge stretches over its track:
 * a quadratic curve from the old chip to the new one, rising further the further
 * memory moved.
 */
export function memoryArcPath(from: number, to: number): string {
  return arcPath(from, to, arcPeakY(from, to));
}

/** How high the arc for a change of this size reaches, in the draw box. */
function arcPeakY(from: number, to: number): number {
  return Math.max(ARC_MIN_PEAK_Y, ARC_BASE_Y - (ARC_PEAK_BASE + memoryCellDistance(from, to) * ARC_PEAK_PER_CELL));
}

/** The quadratic from one chip to another, reaching `peakY` between them. */
function arcPath(from: number, to: number, peakY: number): string {
  const startX = round(memoryCellCenterPercent(from));
  const endX = round(memoryCellCenterPercent(to));
  const controlX = round((startX + endX) / 2);
  // The control point of a quadratic sits twice as far out as the curve's own
  // apex, so it is placed above the peak the arc should actually reach.
  const controlY = round(ARC_BASE_Y - (ARC_BASE_Y - round(peakY)) * 2);
  return `M ${startX} ${ARC_BASE_Y} Q ${controlX} ${controlY} ${endX} ${ARC_BASE_Y}`;
}

/**
 * The prediction arc: the same curve over the same chips, drawn shallower so it
 * sits INSIDE the arc a real change of the same size would leave. The two can be
 * on screen together — a card is picked up while the last change is still fading
 * — and the nesting, plus the dashed dimmer stroke `game.css` gives it, is what
 * keeps "what happened" and "what would happen" from reading as one line.
 */
export function memoryPredictionPath(from: number, to: number): string {
  return arcPath(from, to, ARC_BASE_Y - (ARC_BASE_Y - arcPeakY(from, to)) * PREDICTION_PEAK_SHARE);
}
