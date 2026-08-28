import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-030.js";

describe("EX8-030", () => {
  it("prevents the opponent from gaining memory except through Tamer effects", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "RestrictMemoryGain",
      seat: "opponent",
      exceptTamerEffects: true,
      duration: "permanent",
    }));

  it("enforces the live memory-gain restriction by source kind and seat", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-030", as: "tapirmon" }] } });
    await s.ready();

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon", "Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
  });
});
