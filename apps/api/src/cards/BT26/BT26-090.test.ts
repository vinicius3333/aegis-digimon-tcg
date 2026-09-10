import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-090.js";
import "../index.js";

describe("BT26-090 compiled behavior", () => {
  it("maps Kanan's threshold, End of Your Turn Option use, and Security play", () => {
    expect(getCardDefinition("BT26-090")).toMatchObject({
      nameEn: "Kanan Yuki",
      colors: ["Green"],
      kinds: ["Tamer"],
      types: ["ADAMAS", "TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "memoryAtMost", value: 4 },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      optional: true,
      cost: { kind: "suspend" },
      reduceCostByOpponentMemory: true,
    });
  });

  it("gains memory at four and leaves five unchanged through public turns", async () => {
    const low = setupEngine({
      0: { battleArea: [{ card: "BT26-090", as: "kanan" }], deck: ["BT1-009"] },
      1: { deck: ["BT1-010"] },
    });
    low.state.memory = 4;
    const lowLoop = low.engine.startTurnLoop();
    await advance(low.engine).waitForMainPhase(0);
    expect(low.state.memory).toBe(5);
    expect(low.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await lowLoop;

    const high = setupEngine({
      0: { battleArea: [{ card: "BT26-090", as: "kanan" }], deck: ["BT1-009"] },
      1: { deck: ["BT1-010"] },
    });
    high.state.memory = 5;
    const highLoop = high.engine.startTurnLoop();
    await advance(high.engine).waitForMainPhase(0);
    expect(high.state.memory).toBe(5);
    expect(high.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await highLoop;
  });

  it("keeps the optional TS use gated by suspension and opponent-memory reduction", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      optional: true,
      cost: { kind: "suspend", target: { isSelf: true } },
      reduceCostByOpponentMemory: true,
      target: { filter: { zone: "hand", kind: ["Option"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } },
    });
  });

  it("keeps non-TS Options and an already suspended Tamer ineligible", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      target: { filter: { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } },
    });
  });
});
