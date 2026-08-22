import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_059 } from "./BT24-059.js";
import "../index.js";

describe("BT24-059 Sharkmon", () => {
  it("models the inherited placement-and-unsuspend as an optional paid activation", () => {
    const inherited = BT24_059.effects?.find((entry) => entry.isInherited);
    const action = inherited?.actions?.[0] as any;
    expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(action).toMatchObject({ kind: "Unsuspend", target: { filter: { isSelfRef: true } } });
    expect(action).toMatchObject({ optional: true, abortOnDecline: true });
    expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
  });

  it("De-Digivolves 1 on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-059", as: "sharkmon" }] },
        1: { battleArea: [{ card: "BT24-051", as: "target", under: ["BT24-050"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sharkmon"));

    expect(s.perm("target").topCard.cardId).toBe("BT24-050");
  });

  it("On Deletion plays a cost-7-or-lower TS card suspended and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-059", as: "sharkmon" }],
          deck: [
            { card: "BT24-046", as: "ts" },
            { card: "BT1-001", as: "miss1" },
            { card: "BT1-002", as: "miss2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("sharkmon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("ts").instanceId),
    );
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("ts").instanceId,
    );

    expect(played?.isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("miss1").instanceId, s.inst("miss2").instanceId]),
    );
  });

  it("inherited attack may place another Digimon underneath to unsuspend its host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-060", as: "host", under: ["BT24-059"], suspended: true },
            { card: "BT1-009", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.perm("cost").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costId)).toBe(false);
  });
});
