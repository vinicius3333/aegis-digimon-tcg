/* Where an arrow's beam actually starts and stops. The endpoints the board measures
   are card centres, but a beam drawn centre to centre buries its head in the target
   and its tail under the attacker: a security stack under attack disappeared
   beneath the arrow that named it. The beam is therefore clipped to the boxes at
   each end and pulled back a little further, so the head points at the target's
   edge and the card stays readable. */

export interface ArrowPoint {
  x: number;
  y: number;
}

/** A measured element: its centre plus half its width and height. A bare point has no size. */
export interface ArrowBox extends ArrowPoint {
  halfWidth?: number;
  halfHeight?: number;
}

/** Space left between the beam's end and the box it points at or leaves, in board pixels. */
export const ARROW_GAP = 6;

/**
 * Where the ray from the box centre towards `towards` leaves the box, pulled back
 * by `gap` along the ray. Returns the centre itself when the two coincide or the
 * box has no size. The clipped end never crosses the centre, so a very short beam
 * still points the right way instead of flipping.
 */
export function clipToBox(box: ArrowBox, towards: ArrowPoint, gap = ARROW_GAP): ArrowPoint {
  const dx = towards.x - box.x;
  const dy = towards.y - box.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x: box.x, y: box.y };
  const halfWidth = box.halfWidth ?? 0;
  const halfHeight = box.halfHeight ?? 0;
  const unitX = dx / distance;
  const unitY = dy / distance;
  // Distance along the ray to the box edge: the nearer of the vertical and
  // horizontal boundaries the ray crosses.
  const toVerticalEdge = unitX === 0 ? Infinity : halfWidth / Math.abs(unitX);
  const toHorizontalEdge = unitY === 0 ? Infinity : halfHeight / Math.abs(unitY);
  const toEdge = Math.min(toVerticalEdge, toHorizontalEdge);
  const reach = Math.min(Math.max(toEdge + gap, 0), distance / 2);
  return { x: box.x + unitX * reach, y: box.y + unitY * reach };
}

/** The visible beam between two measured boxes: it leaves one edge and stops short of the other. */
export function beamBetweenBoxes(from: ArrowBox, to: ArrowBox, gap = ARROW_GAP): { from: ArrowPoint; to: ArrowPoint } {
  return { from: clipToBox(from, to, gap), to: clipToBox(to, from, gap) };
}
