import type { SoundDetails, SoundKind } from "../../../design/sound";

export const TIMER_WARNING_SECONDS = 10;

/** What the screen shows that has no event-owned sound: the gauge, the open prompt, the viewer's clock. */
export interface AudioReadouts {
  /** The gauge as painted, from the viewer's side. */
  memory?: number;
  /** Identifies the prompt the viewer is being asked right now, once it is on screen. */
  promptKey?: string;
  /** Whole seconds left on the viewer's own running clock. */
  timerSeconds?: number;
}

export interface ReadoutSound {
  kind: SoundKind;
  details?: SoundDetails;
}

/** The sounds a change between two painted readouts earns. The first readout only sets the baseline. */
export function soundsForReadouts(previous: AudioReadouts | undefined, current: AudioReadouts): ReadoutSound[] {
  if (!previous) return [];
  const sounds: ReadoutSound[] = [];
  if (previous.memory !== undefined && current.memory !== undefined && current.memory !== previous.memory)
    sounds.push({ kind: "memory", details: { steps: Math.abs(current.memory - previous.memory) } });
  if (current.promptKey !== undefined && current.promptKey !== previous.promptKey) sounds.push({ kind: "prompt" });
  const seconds = current.timerSeconds;
  if (seconds !== undefined && seconds > 0 && seconds <= TIMER_WARNING_SECONDS && seconds !== previous.timerSeconds)
    sounds.push({ kind: "timerTick" });
  return sounds;
}
