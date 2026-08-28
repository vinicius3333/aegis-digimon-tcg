/* The one burst the whole board reuses. The reference client instantiates a
   single colour-keyed particle prefab wherever something lands — a permanent
   entering play, a stack evolving, an egg hatching, a card reaching the hand —
   so this is one component with one set of keyframes, coloured by the moment
   (see `burstPalette`). Decoration only: it never takes pointer input and
   carries no text, so reduced motion drops it entirely.

   It paints behind whatever it is given as a sibling, filling its positioned
   parent; the caller owns the box. */

import type { CSSProperties } from "react";
import { burstPalette, type BurstVariant } from "./showcases";
import type { ColorName } from "../design/theme";

/** Eight rays on a 45° wheel, placed by index in game.css. */
const RAY_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7];

export function CardBurst({
  variant,
  color,
  className,
}: {
  variant: BurstVariant;
  /** The card's palette key; ignored by the variants with a fixed vocabulary. */
  color?: ColorName;
  className?: string;
}) {
  const palette = burstPalette(variant, color);
  return (
    <span
      className={`battle-burst battle-burst--${variant}${className ? ` ${className}` : ""}`}
      data-variant={variant}
      aria-hidden="true"
      style={{ "--battle-burst-base": palette.base, "--battle-burst-edge": palette.edge } as CSSProperties}
    >
      <span className="battle-burst__core" />
      <span className="battle-burst__rays">
        {RAY_INDEXES.map((index) => (
          <i key={index} style={{ "--battle-burst-ray": `${index * 45}deg` } as CSSProperties} />
        ))}
      </span>
      <span className="battle-burst__ring" />
      <span className="battle-burst__ring battle-burst__ring--late" />
    </span>
  );
}
