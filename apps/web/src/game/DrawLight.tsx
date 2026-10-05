import { useId, type CSSProperties } from "react";
import { burstPalette } from "./showcases";
import { TIMINGS } from "./timings";

// Two projected fans: long beams into the field, and a narrower vertical fan.
// Coordinates use the temporary face's width; these are an adaptation of the
// observed silhouette, not a reconstruction of the source particle simulation.
const BEAMS = [
  [7.8, -1.05, 0.2],
  [7.2, -0.65, 0.28],
  [7.6, -0.32, 0.13],
  [7.5, -0.04, 0.2],
  [7.8, 0.12, 0.1],
  [6.8, 0.42, 0.2],
  [7.4, 0.65, 0.28],
  [7.5, 0.89, 0.4],
  [6.3, 1.12, 0.42],
  [-0.7, -3.4, 0.17],
  [-0.35, -3.7, 0.2],
  [-0.08, -3.7, 0.13],
  [0.25, -3.5, 0.2],
  [0.6, -3.4, 0.24],
  [1.05, -3.1, 0.25],
  [-0.6, 2.8, 0.19],
  [-0.18, 2.8, 0.13],
  [0.2, 2.6, 0.22],
  [0.7, 2.7, 0.25],
] as const;

/** A brief directional flash behind the decoded deck presentation. */
export function DrawLight({ inward }: { inward: number }) {
  const id = useId();
  const palette = burstPalette("draw");
  return (
    <div
      className="game-draw-light"
      data-draw-light="true"
      style={
        {
          "--draw-light-base": palette.base,
          "--draw-light-edge": palette.edge,
          "--t-draw-light-delay": `${TIMINGS.drawPresentationIn}ms`,
          "--t-draw-light-rays": `${TIMINGS.drawLightRays}ms`,
          "--t-draw-light-glow": `${TIMINGS.drawLightGlow}ms`,
        } as CSSProperties
      }
    >
      <span className="game-draw-light__glow" />
      <svg className="game-draw-light__rays" viewBox="-8 -4 16 8" aria-hidden="true">
        <defs>
          <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.025" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {BEAMS.map(([x, y], index) => (
            <linearGradient
              key={index}
              id={`${id}-${index}`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2={x}
              y2={y}
            >
              <stop offset="0" stopColor="#fff" />
              <stop offset="0.65" stopColor="#fff" />
              <stop offset="0.9" stopColor="var(--draw-light-base)" stopOpacity="0.8" />
              <stop offset="1" stopColor="var(--draw-light-edge)" stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        <g transform={`scale(${inward}, 1)`} filter={`url(#${id}-glow)`}>
          {BEAMS.map(([x, y, width], index) => {
            const length = Math.hypot(x, y);
            const dx = ((-y / length) * width) / 2;
            const dy = ((x / length) * width) / 2;
            return (
              <polygon
                key={index}
                points={`0,0 ${x + dx},${y + dy} ${x - dx},${y - dy}`}
                fill={`url(#${id}-${index})`}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
