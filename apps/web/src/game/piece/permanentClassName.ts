import type { FreezePulse } from "../freezePulse";

/** The permanent wrapper's class list, one cue per standing visual state. */
export function permanentClassName({
  lunge,
  shake,
  freezePulse,
  effectSource,
  candidate,
}: {
  lunge?: "up" | "down";
  shake?: boolean;
  freezePulse?: FreezePulse;
  effectSource?: boolean;
  candidate?: boolean;
}): string | undefined {
  return (
    [
      lunge ? `game-permanent-lunge--${lunge}` : "",
      shake ? "game-permanent-shake" : "",
      freezePulse ? "game-permanent-freeze" : "",
      effectSource ? "game-permanent--effect-source" : "",
      candidate ? "game-permanent--candidate" : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined
  );
}
