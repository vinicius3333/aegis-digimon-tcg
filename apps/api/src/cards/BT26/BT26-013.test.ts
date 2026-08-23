import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-013.js";
import "../index.js";

describe("BT26-013 Musyamon", () => {
  it("compiles Blocker, both trash-to-delete triggers, and inherited DP", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => [e.trigger, e.isInherited])).toEqual([
      ["Static", undefined], ["OnPlay", undefined], ["OnDeletion", undefined], ["YourTurn", true],
    ]);
  });

  it("uses the exact Shambala/TS evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT26-013")).toContainEqual({ level: 3, traits: ["Shambala", "TS"], cost: 2, isAlternate: true });
  });

  it("trashes one hand card and deletes an opponent Digimon at 6000 DP or less", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT26-013", as: "self" }, { card: "BT1-009", as: "cost" }] },
      1: { battleArea: [{ card: "BT26-012", as: "target", dp: 6000 }, { card: "BT26-014", as: "safe", dp: 7000 }] },
    }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT26-014");
  });

  it("resolves the same paid deletion when Musyamon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-013", as: "self" }],
        hand: [{ card: "BT1-009", as: "cost" }],
      },
      1: {
        battleArea: [
          { card: "BT26-012", as: "target", dp: 6000 },
          { card: "BT26-014", as: "safe", dp: 7000 },
        ],
      },
    }, { autoSelectCards: true });
    const selfId = s.perm("self").topCard.instanceId;
    const safeId = s.perm("safe").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("self").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      selfId,
      s.inst("cost").instanceId,
    ]));
    expect(s.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(safeId);
  });

  it("does not delete or trash a hand card when no opponent Digimon is within 6000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-013", as: "self" }],
        hand: [{ card: "BT1-009", as: "cost" }],
      },
      1: { battleArea: [{ card: "BT26-014", as: "safe", dp: 7000 }] },
    }, { autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("self"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("publishes Blocker while Musyamon is the stack's top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-013", as: "self" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Blocker")).toBe(true);
  });

  it("applies inherited +2000 DP only on the owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-014", as: "host", under: [{ card: "BT26-013", as: "source" }] }] } });
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), { attackerPermanentId: s.perm("host").permanentId });
    expect(s.perm("host").currentDP).toBe(9000);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "BT26-014", as: "host", under: [{ card: "BT26-013" }] }] },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(opponentTurn.perm("host").currentDP).toBe(7000);
  });
});
