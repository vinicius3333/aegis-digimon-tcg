import { describe, expect, it } from "vitest";
import type { Permanent } from "@aegis/shared";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-040.js";

function effectiveColors(s: EngineSetup, permanent: Permanent): string[] {
  return (s.engine as unknown as { effectiveColorsOf(target: Permanent): string[] }).effectiveColorsOf(permanent);
}

describe("BT3-040 Shakkoumon", () => {
  it("is also treated as blue during its owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-040", as: "shakkoumon" }] } });

    await s.engine.recomputeContinuousEffects();

    expect(effectiveColors(s, s.perm("shakkoumon"))).toEqual(expect.arrayContaining(["Yellow", "Blue"]));
  });

  it("Q1076 does not grant blue while Shakkoumon is in breeding", async () => {
    const s = setupEngine({ 0: { breeding: { card: "BT3-040", as: "shakkoumon" } } });
    await s.engine.recomputeContinuousEffects();

    expect(effectiveColors(s, s.perm("shakkoumon"))).toEqual(["Yellow"]);
  });

  it("gives Security Attack -1 only to opposing Digimon without digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-040", as: "shakkoumon" }] },
      1: {
        battleArea: [
          { card: "BT1-019", as: "sourceless" },
          { card: "BT1-019", as: "withSource", under: ["BT1-010"] },
        ],
      },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("sourceless"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("withSource"), "SecurityAttack")).toBe(0);
  });
});
