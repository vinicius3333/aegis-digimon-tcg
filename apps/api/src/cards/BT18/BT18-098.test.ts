import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-098.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT18-098 Dragon's Roar", () => {
  it("covers the effect-driven security trash trigger and color waiver", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDiscardSecurity",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } } } },
        { kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 }, condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "eq", value: 0 } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { colors: ["Yellow"], nameOrTrait: [{ tokens: ["Data", "Witchelny"], match: "trait" }] } } }],
    });
  });

  it("requires the top-security trash before the Main then-clause (Q3050)", () => {
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "ModifyDP", amount: -6000, duration: "untilOpponentTurnEnd", cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security" } } } },
        { kind: "SecurityManipulation", op: "addBottom", source: "this", condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 } },
      ],
    });
  });

  it("executes Main through the GameEngine: trashes security, reduces DP, then returns this Option to security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT18-036"],
          hand: [{ card: "BT18-098", as: "option" }],
          security: ["BT1-110", "BT1-111", "BT1-112"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3 && s.perm("target").currentDP === 6000);

    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(s.inst("option").instanceId);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("option").instanceId)).toBe(false);
  });
});
