/* The dark mask a board-answered target prompt drops over the field, with a hole
   punched over each card the server offered. It is the reference client's
   "hide what cannot be selected" pass: everything dims, the legal targets stay
   lit, and the eye has nowhere else to go.

   Pure geometry. The caller measures the elements (the same
   `getBoundingClientRect` pass the delete bursts already use) and hands the boxes
   here in board coordinates; this module turns them into the holes the mask cuts.
   Which cards are selectable is the server's `candidateInstanceIds` and is never
   decided here. */

/** A measured element, in the board's own coordinate space. */
export interface SpotlightSubject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * The card inside this box is turned 90°. The box itself is the wrapper's, which
   * does not rotate with it, so the hole has to be turned instead — otherwise a
   * suspended Digimon is lit across its short side and clipped along its long one.
   */
  suspended?: boolean;
}

/** One hole in the mask, centred on its subject. */
export interface SpotlightHole {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

/** How far past the card's edge the lit area reaches. */
export const SPOTLIGHT_PADDING_PX = 7;

/** Corner rounding, matched to the card art's own. */
export const SPOTLIGHT_RADIUS_PX = 11;

/**
 * The holes the mask cuts for a set of measured subjects. A subject with no box
 * (an element that never laid out, which is every element under jsdom) is
 * dropped rather than punched as a zero-size hole.
 */
export function spotlightHoles(
  subjects: readonly SpotlightSubject[],
  padding: number = SPOTLIGHT_PADDING_PX,
): SpotlightHole[] {
  const holes: SpotlightHole[] = [];
  for (const subject of subjects) {
    if (subject.width <= 0 || subject.height <= 0) continue;
    const centerX = subject.x + subject.width / 2;
    const centerY = subject.y + subject.height / 2;
    // The card turns about its own centre, and a rectangle turned a quarter turn
    // about its centre IS the rectangle with its sides swapped — so the hole for a
    // suspended card swaps them rather than carrying a rotation of its own.
    const width = (subject.suspended ? subject.height : subject.width) + padding * 2;
    const height = (subject.suspended ? subject.width : subject.height) + padding * 2;
    holes.push({
      id: subject.id,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      radius: SPOTLIGHT_RADIUS_PX,
    });
  }
  return holes;
}
