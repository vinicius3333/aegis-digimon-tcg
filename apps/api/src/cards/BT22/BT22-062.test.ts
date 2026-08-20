import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-062.js";

describe("BT22-062 MetalTyrannomon (X Antibody)", () => {
  it("requires a non-X Antibody Tyrannomon and gates the digivolving restriction on the stack", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([
      {
        level: 5,
        names: ["Tyrannomon"],
        excludeTraits: ["X Antibody"],
        cost: 1,
      },
    ]);

    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 4000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
    expect(whenDigivolving?.actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "digivolve",
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { tokens: ["MetalTyrannomon"], match: "name" },
            { tokens: ["X Antibody"], match: "trait" },
          ],
        },
      },
    });
  });

  it("lets the opponent optionally choose one of their Digimon to attack", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "EndOfOpponentsTurn", frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "Attack",
      optional: true,
      drainTimingWindowDuringAttack: true,
      target: {
        filter: { controller: "opponent", kind: ["Digimon"] },
        count: 1,
        chooser: "opponent",
      },
    });
  });

  it("pays 1 from MetalTyrannomon, gains 4000 DP, and locks an opponent's evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "metaltyrannomon" }],
          hand: [{ card: "BT22-062", as: "x-antibody" }],
        },
        1: { battleArea: [{ card: "BT22-071", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metaltyrannomon").permanentId,
        instanceId: s.inst("x-antibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "digivolve"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("metaltyrannomon").currentDP).toBe(12000);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "digivolve")).toBe(true);
  });
});
