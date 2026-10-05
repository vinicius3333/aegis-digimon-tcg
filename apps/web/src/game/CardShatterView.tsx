import type { CSSProperties } from "react";
import { CardFull } from "../design/cards";
import { CardBurst } from "./CardBurst";
import { CARD_FRACTURE } from "./cardShatter";
import type { ColorName } from "../design/theme";
import type { ParticleLightOwner } from "./independentParticleLight";

export function CardShatter({
  cardId,
  artId,
  width,
  color,
  lightOwner,
}: {
  cardId: string;
  artId?: string;
  width: number;
  color: ColorName;
  lightOwner?: ParticleLightOwner;
}) {
  return (
    <span className="game-card-shatter" aria-hidden="true">
      {CARD_FRACTURE.map((shard, index) => (
        <span
          key={index}
          className="game-card-shatter__shard"
          style={
            {
              clipPath: shard.clipPath,
              "--shard-x": `${shard.driftX}%`,
              "--shard-y": `${shard.driftY}%`,
            } as CSSProperties
          }
        >
          <CardFull cardId={cardId} artId={artId} width={width} zoomOnHover={false} />
        </span>
      ))}
      <CardBurst variant="evolve" color={color} className="game-card-shatter__burst" lightOwner={lightOwner} />
    </span>
  );
}
