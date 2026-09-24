import type { FreezePulse } from "../freezePulse";

/** The permanent wrapper's class list, one cue per standing visual state. */
export function permanentClassName({
  lunge,
  shake,
  freezePulse,
  effectSource,
  effectLinked,
  candidate,
  threatened,
}: {
  lunge?: "up" | "down";
  shake?: boolean;
  freezePulse?: FreezePulse;
  effectSource?: boolean;
  effectLinked?: boolean;
  candidate?: boolean;
  threatened?: boolean;
}): string {
  return (
    [
      "game-permanent",
      lunge ? `game-permanent-lunge--${lunge}` : "",
      shake ? "game-permanent-shake" : "",
      freezePulse ? "game-permanent-freeze" : "",
      effectSource ? "game-permanent--effect-source" : "",
      effectLinked ? "game-permanent--effect-linked" : "",
      candidate ? "game-permanent--candidate" : "",
      threatened ? "game-permanent--threatened" : "",
    ]
      .filter(Boolean)
      .join(" ")
  );
}
