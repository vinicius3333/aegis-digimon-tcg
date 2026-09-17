import type { CSSProperties } from "react";

/** The three gashes of the claw, each a little behind the one above it. */
const CLAW_TINE_INDEXES = [0, 1, 2];

/**
 * The claw the reference client rakes across a permanent that lost its battle:
 * three tapered gashes swept corner to corner in a quarter of a second, ahead of
 * the deletion burst. Drawn rather than drop-shadowed so the taper survives at the
 * compact card widths a phone lays the board out at.
 */
export function ClawSlash() {
  return (
    <span className="game-claw" aria-hidden="true">
      <svg viewBox="0 0 100 140" preserveAspectRatio="none" focusable="false">
        {CLAW_TINE_INDEXES.map((index) => (
          <path
            key={index}
            className="game-claw__tine"
            style={{ "--claw-index": index } as CSSProperties}
            d={`M ${-14 + index * 22} ${-6 + index * 4} C ${26 + index * 20} ${34 + index * 6}, ${52 + index * 18} ${72 + index * 6}, ${104 + index * 12} ${138 + index * 4}`}
          />
        ))}
      </svg>
    </span>
  );
}
