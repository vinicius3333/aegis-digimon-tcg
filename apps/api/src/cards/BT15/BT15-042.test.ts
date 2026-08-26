import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-042.js";

describe("BT15-042", () => {
  it("may trash security to give an opposing Digimon -9000 DP on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "ModifyDP", amount: -9000, cost: { kind: "trash" }, optional: true }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "ModifyDP", amount: -9000 }],
    });
  });
  it("once per turn may place a yellow card from hand as security when your security is removed", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "mine" },
          actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["hand"] }],
        },
      ],
    }));

  it("trashes security as the optional cost before giving one opponent -9000 DP", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-042", as: "magnadramon" }], security: [{ card: "BT1-001", as: "cost" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 10000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magnadramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 1000, 1_500);

    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });
});
