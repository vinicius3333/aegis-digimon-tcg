import type { CSSProperties } from "react";
import type { ArrowPoint } from "./types";

/**
 * A trail of filled chevrons points between the real card edges. Each trail ends
 * at its own target; it never continues across the art to another zone.
 */
export function AttackArrow({
  from,
  to,
  kind = "attack",
  tracking = false,
}: {
  from: ArrowPoint;
  to: ArrowPoint | readonly ArrowPoint[];
  kind?: "attack" | "effect";
  tracking?: boolean;
}) {
  const targets = Array.isArray(to) ? (to as readonly ArrowPoint[]) : [to as ArrowPoint];
  return (
    <svg
      className={`game-attack-arrow game-attack-arrow--${kind}${tracking ? " game-attack-arrow--tracking" : ""}`}
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 60, pointerEvents: "none" }}
    >
      {targets.map((target, index) => {
        const dx = target.x - from.x;
        const dy = target.y - from.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 1) return null;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const width = Math.min(28, Math.max(22, distance * 0.085));
        const headLength = Math.min(24, distance * 0.4);
        const count = Math.max(0, Math.min(40, Math.floor((distance - headLength - 26) / 28) + 1));
        const lastPosition = distance - headLength - 14;
        return (
          <g key={index} fill={`var(--battle-arrow-${kind})`}>
            {Array.from({ length: count }, (_, step) => {
              const position = lastPosition - (count - step - 1) * 28;
              const progress = (step + 1) / Math.max(1, count);
              return (
                <g
                  key={step}
                  transform={`translate(${from.x + (dx / distance) * position} ${from.y + (dy / distance) * position}) rotate(${angle})`}
                  opacity={0.25 + progress * 0.6}
                >
                  <path
                    className="game-attack-arrow__chevron"
                    d="M-6,-12 L6,0 L-6,12 L-12,12 L0,0 L-12,-12 Z"
                    transform={`scale(${width / 24})`}
                    style={{ "--arrow-step": step } as CSSProperties}
                  />
                </g>
              );
            })}
            <g transform={`translate(${target.x} ${target.y}) rotate(${angle})`}>
              <path
                className="game-attack-arrow__head"
                d={`M0,0 L${-headLength},${-headLength / 2} L${-headLength},${headLength / 2} Z`}
                style={{ "--arrow-step": count } as CSSProperties}
              />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
