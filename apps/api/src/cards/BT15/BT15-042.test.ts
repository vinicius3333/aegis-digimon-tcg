import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
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
          actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["hand"], position: "choice" }],
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

  it("places a yellow hand card at the chosen bottom after own security removal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-042", as: "magnadramon" }],
          hand: [{ card: "BT15-033", as: "yellow" }],
          security: [
            { card: "BT1-001", as: "top" },
            { card: "BT1-002", as: "bottom" },
          ],
        },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("bottom").instanceId,
      s.inst("yellow").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("top").instanceId);
  });

  it("digivolves legally from a level-5 yellow Digimon and preserves the source stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-060", as: "yellowBase" }],
          hand: [{ card: "BT15-042", as: "magnadramon" }],
          security: [{ card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 10000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("magnadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowBase").topCard?.cardId === "BT15-042");

    expect(s.perm("yellowBase").stack.map((card) => card.cardId)).toEqual(["BT1-060"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").currentDP).toBe(1000);
  });
});
