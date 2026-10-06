import { useId } from "react";

// Unequal lobes approximate the recorded source-local flare without copying its texture.
const rays = Array.from({ length: 18 }, (_, index) => {
  const angle = ((index * 20 + [-4, 3, 1][index % 3]!) * Math.PI) / 180;
  const length = [98, 74, 88, 69, 103, 81][index % 6]!;
  const spread = [0.095, 0.15, 0.11, 0.17][index % 4]!;
  const point = (radius: number, offset: number) =>
    `${Math.cos(angle + offset) * radius},${Math.sin(angle + offset) * radius * 1.4}`;
  return `M ${point(28, -spread * 1.8)} L ${point(length * 0.76, -spread * 0.7)} L ${point(length, 0)} L ${point(length * 0.76, spread * 0.7)} L ${point(28, spread * 1.8)} Z`;
});

/** A single short flare around the actual field face, independent of clause reading. */
export function FieldActivationLight() {
  const id = useId();
  return (
    <g className="game-field-activation-light">
      <defs>
        <radialGradient
          id={`${id}-bloom`}
          gradientTransform="scale(1 1.4)"
          gradientUnits="userSpaceOnUse"
          cx="0"
          cy="0"
          r="110"
        >
          <stop offset="0.28" stopColor="white" />
          <stop offset="0.48" stopColor="white" stopOpacity="0.95" />
          <stop offset="0.65" stopColor="var(--battle-arrow-effect)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--battle-arrow-effect)" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      <g fill={`url(#${id}-bloom)`} filter={`url(#${id}-soft)`}>
        <ellipse rx="81" ry="113.4" className="game-field-activation-light__bloom" />
        {rays.map((path, index) => (
          <path key={index} d={path} />
        ))}
      </g>
    </g>
  );
}
