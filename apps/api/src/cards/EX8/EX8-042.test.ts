import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition, requireCardDefinition, PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./index.js";
import { compiled } from "./EX8-042.js";

describe("EX8-042", () => {
  it("matches the committed catalog identity, evolution, and printed text", () => {
    expect(getCardDefinition("EX8-042")).toMatchObject({
      cardId: "EX8-042",
      nameEn: "MegaKabuterimon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Insectoid", "NSp"],
      effectText:
        "[Digivolve]Lv.4 w/[NSp]\u00a0trait: Cost 3 \n\n＜Fortitude＞ (When this Digimon with digivolution cards is deleted, play this card without paying the cost)\n[All Turns] While this Digimon is suspended, it gets +3000 DP.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon deletes an opponent's Digimon in battle, trash the top card of your opponent's security stack.",
    });
    expect(getCardDefinition("EX8-042")?.securityEffectText).toBeUndefined();
    expect(digivolutionRequirementsFor("EX8-042")).toEqual([{ level: 4, traits: ["NSp"], cost: 3, isAlternate: true }]);
  });

  it("traces Fortitude, the suspended aura, and the inherited once-per-turn battle limit", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Fortitude",
      raw: "＜Fortitude＞",
    });
    expect(
      compiled.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "Aura",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      effect: { kind: "modifyDP", amount: 3000 },
      while: { kind: "selfIsSuspended" },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.isInherited).toBe(true);
  });

  it("uses the standard Green level-4 route for exactly three", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-071", as: "base" }], hand: [{ card: "EX8-042", as: "mega" }] },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mega").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-042");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-071"]);
    expect(s.state.memory).toBe(0);
  });
  it("applies the suspended +3000 DP aura in a live game", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-042", as: "mega", suspended: true }] } });
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).recompute();
    expect(player.battleArea[0]!.currentDP).toBe(requireCardDefinition("EX8-042").dp! + 3000);
    await advance(s.engine).verb.unsuspend([s.perm("mega").permanentId]);
    expect(s.perm("mega").currentDP).toBe(7000);
    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("mega").permanentId]);
    expect(s.perm("mega").currentDP).toBe(10000);
  });
  it("trashes the top opposing security once when the host deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 10000, under: ["EX8-042"] }] },
      1: {
        battleArea: [
          { card: "BT1-016", as: "defender", dp: 1000, suspended: true },
          { card: "BT1-016", as: "second", dp: 1000, suspended: true },
        ],
        security: [
          { card: "BT1-010", as: "top" },
          { card: "BT1-011", as: "bottom" },
        ],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("replays itself through Fortitude when deleted with a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-042", as: "mega", under: ["EX8-040"] }] },
    });
    const instanceId = s.inst("mega").instanceId;
    const oldPermanentId = s.perm("mega").permanentId;
    await advance(s.engine).verb.deletePermanent([s.perm("mega").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(instanceId);
    expect(s.state.players[0]!.battleArea[0]!.permanentId).not.toBe(oldPermanentId);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX8-040"]);
  });

  it("stays deleted without digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-042", as: "mega" }] } });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("mega").permanentId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX8-042"]);
  });

  it("evolves from an off-color level-4 NSp for three but rejects a non-NSp base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-018", as: "base" }], hand: [{ card: "EX8-042", as: "mega" }], deck: ["BT1-045"] },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mega").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-045"));
    expect(s.perm("base").topCard.cardId).toBe("EX8-042");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("EX7-018");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-045"]);
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-037", as: "base" }], hand: [{ card: "EX8-042", as: "mega" }] },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("mega").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not activate the inherited security trash when both battlers are deleted (Q3927)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 3000, under: ["EX8-042"] }] },
      1: {
        battleArea: [{ card: "BT1-016", as: "defender", dp: 3000, suspended: true }],
        security: [
          { card: "BT1-010", as: "top" },
          { card: "BT1-011", as: "bottom" },
        ],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
