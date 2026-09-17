/* The two attack arrows the board can draw at once: the preview that follows the
   chosen attacker to the target it would hit, and the persistent one that flashes
   twice as it extends and then stays up, following its endpoints until the attack or
   the effect is over. */

import { AttackArrow } from "../../piece";
import type { TrackingArrowGeometry } from "../types";

export function AttackArrowLayer({
  preview,
  tracking,
}: {
  preview: { from: { x: number; y: number }; to: { x: number; y: number } } | null;
  tracking: TrackingArrowGeometry | null;
}) {
  return (
    <>
      {preview ? <AttackArrow from={preview.from} to={preview.to} /> : null}
      {tracking ? (
        <AttackArrow key={tracking.key} from={tracking.from} to={tracking.to} kind={tracking.kind} tracking />
      ) : null}
    </>
  );
}
