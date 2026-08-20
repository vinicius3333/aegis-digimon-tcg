import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-035.js";

describe("BT23-035 Dynasmon", () => {
  it("ignores opposing security removal, then buffs and recovers any deck-top card from its own removal", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-035", as: "dynasmon" }],
        security: [
          { card: "BT1-009", as: "ownTop" },
          { card: "BT1-010", as: "ownBottom" },
        ],
        deck: [{ card: "BT23-100", as: "recoveryOption" }],
      },
      1: { security: [{ card: "BT1-011", as: "opposingSecurity" }] },
    });
    const recoveredId = s.inst("recoveryOption").instanceId;

    await advance(s.engine).verb.trashFromSecurity(1, 1, { fromTop: true });
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: recoveredId });
  });

  it("declares Barrier", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("requires trashing the top security card to reduce all opposing Digimon by 6000", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
        amount: -6000,
        duration: "forTheTurn",
        cost: {
          kind: "trash",
          target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
        },
      });
      expect(action.optional).toBeUndefined();
      expect(action.abortOnDecline).toBeUndefined();
    }
  });

  it("gains Security Attack +1 and conditionally recovers at end of the security-removal trigger", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "mine" },
    });
    expect(effect.actions[0].actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "untilYourTurnEnd" },
      {
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        controller: "mine",
        from: ["deck"],
        toTop: true,
        amount: 1,
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
      },
    ]);
  });
});
