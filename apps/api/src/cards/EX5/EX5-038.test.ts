import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-038.js";

describe("EX5-038 Vikaralamon", () => {
  it("draws and plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"] },
    ]);
  });
  it("once per turn unsuspends itself when one of your Digimon is deleted", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, isSelf: true } }],
        },
      ],
    });
  });
  it("inherits Piercing once per turn for the Four Sovereigns or God Beast trait", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
          target: { filter: { isSelfRef: true } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ match: "trait", tokens: ["Four Sovereigns", "God Beast"] }] },
          },
        },
      ],
    });
  });

  it("draws and plays a Deva into breeding through the public On Play path", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-038", as: "vikaralamon" },
            { card: "BT10-079", as: "deva" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vikaralamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT10-079");
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT10-079");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("deva").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("unsuspends itself after its Digimon wins a battle, but only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-038", as: "source", suspended: true },
          { card: "BT1-010", as: "attacker" },
        ],
      },
      1: { battleArea: [{ card: "BT1-021", as: "opponent", suspended: true }] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("attacker").permanentId,
      deletedPermanentId: s.perm("opponent").permanentId,
    });
    await settle(() => !s.perm("source").isSuspended);
    expect(s.perm("source").isSuspended).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("source").permanentId]);
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("attacker").permanentId,
      deletedPermanentId: s.perm("opponent").permanentId,
    });
    expect(s.perm("source").isSuspended).toBe(true);
  });
});
