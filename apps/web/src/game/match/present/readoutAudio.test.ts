import { describe, expect, it } from "vitest";
import { soundsForReadouts, TIMER_WARNING_SECONDS } from "./readoutAudio";

describe("readout audio", () => {
  it("treats the first readout as a baseline, not a change", () => {
    expect(soundsForReadouts(undefined, { memory: 3, promptKey: "d1", timerSeconds: 5 })).toEqual([]);
  });

  it("ticks the gauge once per move, weighted by the points it travelled", () => {
    expect(soundsForReadouts({ memory: 3 }, { memory: -2 })).toEqual([{ kind: "memory", details: { steps: 5 } }]);
    expect(soundsForReadouts({ memory: 3 }, { memory: 3 })).toEqual([]);
  });

  it("announces each new prompt once and stays quiet while it stays open or closes", () => {
    expect(soundsForReadouts({}, { promptKey: "d1" })).toEqual([{ kind: "prompt" }]);
    expect(soundsForReadouts({ promptKey: "d1" }, { promptKey: "d1" })).toEqual([]);
    expect(soundsForReadouts({ promptKey: "d1" }, {})).toEqual([]);
    expect(soundsForReadouts({ promptKey: "d1" }, { promptKey: "d2" })).toEqual([{ kind: "prompt" }]);
  });

  it("ticks only the viewer's final seconds, once per second", () => {
    expect(soundsForReadouts({ timerSeconds: 12 }, { timerSeconds: 11 })).toEqual([]);
    expect(soundsForReadouts({ timerSeconds: 11 }, { timerSeconds: TIMER_WARNING_SECONDS })).toEqual([
      { kind: "timerTick" },
    ]);
    expect(soundsForReadouts({ timerSeconds: 4 }, { timerSeconds: 4 })).toEqual([]);
    expect(soundsForReadouts({ timerSeconds: 1 }, { timerSeconds: 0 })).toEqual([]);
    expect(soundsForReadouts({ timerSeconds: 4 }, {})).toEqual([]);
  });
});
