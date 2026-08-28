/* A deleted card breaking into its own art (`Effects.cs:1693-1788`). One copy of
   the card per shard, each clipped to its wedge and thrown; the colour-matched
   burst behind them is the shared `CardBurst`.

   Decoration only — the deletion is already narrated by its panel — so reduced
   motion drops it. The caller places the box; this fills it. */

import type { CSSProperties } from "react";
import { CardFull } from "../design/cards";
import { CardBurst } from "./CardBurst";
import { cardShards } from "./cardShatter";
import type { ColorName } from "../design/theme";

export function CardShatter({ cardId, width, color }: { cardId: string; width: number; color: ColorName }) {
  return (
    <span className="game-card-shatter" aria-hidden="true" style={{ width, height: Math.round(width * 1.4) }}>
      {cardShards().map((shard, index) => (
        <span
          key={index}
          className="game-card-shatter__shard"
          style={
            {
              clipPath: shard.clipPath,
              "--shard-x": `${shard.driftX * 100}%`,
              "--shard-y": `${shard.driftY * 100}%`,
              "--shard-spin": `${shard.spinDeg}deg`,
              "--shard-delay": `${shard.delayMs}ms`,
            } as CSSProperties
          }
        >
          <CardFull cardId={cardId} width={width} zoomOnHover={false} />
        </span>
      ))}
      <CardBurst variant="delete" color={color} className="game-card-shatter__burst" />
    </span>
  );
}
