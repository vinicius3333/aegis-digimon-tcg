import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT1-108.js";

describe("BT1-108 Horn Buster", () => {
  it("matches the catalog and compiles both printed effects", () => {
    expect(getCardDefinition("BT1-108")).toMatchObject({ nameEn: "Horn Buster", playCost: 1 });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "Main",
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            amount: 3000,
            duration: "forTheTurn",
          },
        ],
      },
      {
        trigger: "Security",
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
          { kind: "AddToHandSelf" },
        ],
      },
    ]);
  });

  it("gives exactly one of your Digimon +3000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "chosen" },
            { card: "BT1-011", as: "other" },
          ],
          hand: [{ card: "BT1-108", as: "option" }],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const otherDP = s.perm("other").currentDP;
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("chosen").currentDP === 7000);

    expect(s.perm("chosen").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(otherDP);

    await advance(s.engine).runTurn(0);
    expect(s.perm("chosen").currentDP).toBe(4000);
  });

  it("suspends one opponent Digimon and returns itself to hand from security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT1-108", as: "securityOption", faceUp: true }],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "chosen" },
          { card: "BT1-011", as: "other" },
        ],
      },
    });
    const optionId = s.inst("securityOption").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(optionId);
  });
});
