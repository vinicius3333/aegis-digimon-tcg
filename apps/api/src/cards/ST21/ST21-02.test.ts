import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST21-02 Gomamon", () => {
  it("matches the All Turns memory restriction and Tamer exception", () => {
    const action = runtimeCompiledCard("ST21-02")?.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];

    expect(action).toEqual({
      kind: "RestrictMemoryGain",
      seat: "opponent",
      exceptTamerEffects: true,
      duration: "permanent",
    });
  });

  it("blocks only the opponent's non-Tamer effect memory gain on the live board", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST21-02", as: "gomamon" }] } });
    await s.ready();

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Option"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
  });
});
