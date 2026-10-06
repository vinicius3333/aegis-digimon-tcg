/* Field arrivals add four landing groups to the shared six colour-light emitters.
   Short reveal/draw/security accents retain their separate ray clocks.
   The caller owns its positioned box; decoration never takes pointer input. */

import type { CSSProperties } from "react";
import { burstPalette, type BurstVariant } from "./showcases";
import type { ColorName } from "../design/theme";
import { ParticleLight } from "./ParticleLightView";
import type { ParticleLightOwner } from "./independentParticleLight";

/* Fixed variations keep the light irregular without changing between replays.
   Longer needles alternate with shorter, broader beams around the white core. */
const RAYS = Array.from({ length: 24 }, (_, index) => ({
  angle: index * 15 + [-3, 2, -1, 4][index % 4]!,
  length: [1, 0.66, 0.88, 0.58, 1.12, 0.76][index % 6]!,
  width: [3.6, 1.8, 2.6, 4.2, 2, 3][index % 6]!,
}));

export function CardBurst({
  variant,
  color,
  className,
  particleLight = true,
  cueKey,
  lightOwner,
  landing = false,
}: {
  variant: BurstVariant;
  /** The card's palette key; ignored by the variants with a fixed vocabulary. */
  color?: ColorName;
  className?: string;
  /** Short reveal flashes retain their own ray clock. */
  particleLight?: boolean;
  cueKey?: number;
  lightOwner?: ParticleLightOwner;
  /** Physical play, evolution and hatch add the four landing groups. */
  landing?: boolean;
}) {
  const palette = burstPalette(variant, color);
  const particles = particleLight && (variant === "play" || variant === "evolve" || variant === "hatch");
  return (
    <span
      className={`battle-burst battle-burst--${variant}${particles ? " battle-burst--particles" : ""}${className ? ` ${className}` : ""}`}
      data-variant={variant}
      data-cue-key={cueKey}
      aria-hidden="true"
      style={{ "--battle-burst-base": palette.base, "--battle-burst-edge": palette.edge } as CSSProperties}
    >
      {particles ? (
        <ParticleLight palette={palette} owner={lightOwner} landing={landing && !lightOwner} />
      ) : (
        <>
          <span className="battle-burst__core" />
          <span className="battle-burst__rays">
            {RAYS.map((ray, index) => (
              <i
                key={index}
                style={
                  {
                    "--battle-burst-ray": `${ray.angle}deg`,
                    "--battle-burst-ray-length": ray.length,
                    "--battle-burst-ray-width": `${ray.width}%`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
          <span className="battle-burst__ring" />
          <span className="battle-burst__ring battle-burst__ring--late" />
        </>
      )}
    </span>
  );
}
