import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST16-03.js";

describe("ST16-03 Gabumon", () => {
  it("gains 1 memory at the start of main when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST16-03", as: "gabumon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("gabumon"));

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when the opponent has no Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST16-03", as: "gabumon" }] } });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("gabumon"));

    expect(s.state.memory).toBe(0);
  });
});
