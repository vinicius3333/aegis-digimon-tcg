import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-027.js";
import "../index.js";

describe("BT24-027 Lanamon", () => {
  it("requires the qualifying hand placement on entry", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)?.actions?.[0] as any;
      expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
      expect(action.cost.optional).toBeUndefined();
      expect(action.cost.abortOnDecline).toBeUndefined();
      expect(action.abortOnDecline).toBe(true);
    }
  });

  it("implements Decode by playing Calmaramon from the stack on non-battle removal", () => {
    const decode = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions?.[0] as any;
    expect(decode).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanBattle",
      sourceFilter: { isSelfRef: true },
    });
    expect(decode.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true });
    expect(decode.actions[0].target.filter.nameOrTrait).toEqual([{ tokens: ["Calmaramon"], match: "name" }]);
  });

  it("uses an exact Calmaramon evolution requirement", () => {
    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Calmaramon"],
      cost: 0,
      isAlternate: true,
    });
  });

  it("places a qualifying hand card at the bottom before granting battle-deletion protection", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-027", as: "lanamon" },
            { card: "BT24-020", as: "protected" },
          ],
          hand: [{ card: "BT24-022", as: "placed" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("placed").instanceId, s.perm("protected").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lanamon"));

    expect(s.perm("lanamon").stack[0]?.instanceId).toBe(s.inst("placed").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("protected"), "beDeletedInBattle")).toBe(true);
  });

  it("does not grant protection when the placement cost cannot be paid", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-027", as: "lanamon" },
          { card: "BT24-020", as: "candidate" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lanamon"));

    expect(observe(s.engine).isRestricted(s.perm("candidate"), "beDeletedInBattle")).toBe(false);
  });

  it("Decodes Calmaramon only on non-battle removal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-027", as: "lanamon", under: [{ card: "BT24-023", as: "calmaramon" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("lanamon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-023"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("calmaramon").instanceId,
    );
  });

  it("draws once while the inherited host has 7 or fewer cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-020", as: "host", under: ["BT24-027"] }],
        deck: ["BT1-001", "BT1-002"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
