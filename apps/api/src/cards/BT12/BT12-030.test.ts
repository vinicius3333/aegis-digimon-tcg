import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-030.js";
import "./BT12-031.js";

describe("BT12-030 Imperialdramon: Dragon Mode", () => {
  it("has both printed 3-cost alternate evolution routes", () => {
    expect(digivolutionRequirementsFor("BT12-030")).toEqual(
      expect.arrayContaining([
        { names: ["Paildramon"], cost: 3, isAlternate: true },
        { names: ["Dinobeemon"], cost: 3, isAlternate: true },
      ]),
    );
  });

  it("unsuspends itself for a blue source and suspends an opponent for a green source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-030", as: "dragon", under: ["BT12-028"], suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dragon"));
    expect(s.perm("dragon").isSuspended).toBe(false);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("resolves each source-color clause independently", async () => {
    const blue = setupEngine({
      0: { battleArea: [{ card: "BT12-030", as: "dragon", under: ["BT12-021"], suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    await advance(blue.engine).fire(EffectTiming.WhenDigivolving, blue.perm("dragon"));
    expect(blue.perm("dragon").isSuspended).toBe(false);
    expect(blue.perm("target").isSuspended).toBe(false);

    const green = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-030", as: "dragon", under: ["BT1-064"], suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(green.engine).fire(EffectTiming.WhenDigivolving, green.perm("dragon"));
    expect(green.perm("dragon").isSuspended).toBe(true);
    expect(green.perm("target").isSuspended).toBe(true);
  });

  it("may evolve into Imperialdramon at end of attack with the cost reduced by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-030", as: "dragon" }],
          hand: [{ card: "BT12-031", as: "fighter" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("dragon"));
    await settle(() => s.perm("dragon").topCard.cardId === "BT12-031");
    expect(s.state.memory).toBe(0);
    expect(s.perm("dragon").stack.map(({ cardId }) => cardId)).toContain("BT12-030");
  });
});
