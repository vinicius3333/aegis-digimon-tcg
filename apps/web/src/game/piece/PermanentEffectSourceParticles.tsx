import type { CSSProperties } from "react";

/** Particles orbiting a permanent while its own effect is activating. */
const EFFECT_SOURCE_PARTICLE_OFFSETS = [
  [0, -1],
  [0.7, -0.7],
  [1, 0],
  [0.7, 0.7],
  [0, 1],
  [-0.7, 0.7],
  [-1, 0],
  [-0.7, -0.7],
] as const;

/** The small particle throw a permanent plays while its own effect is activating. */
export function PermanentEffectSourceParticles() {
  return (
    <span className="game-effect-source-particles" aria-hidden="true">
      {EFFECT_SOURCE_PARTICLE_OFFSETS.map(([x, y], index) => (
        <i
          key={index}
          style={
            {
              "--effect-particle-index": index,
              "--effect-particle-x": x,
              "--effect-particle-y": y,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
