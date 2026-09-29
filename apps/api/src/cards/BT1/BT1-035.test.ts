import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-035.js";

describe("BT1-035 Leomon", () => {
  it("matches the catalog and exact On Deletion IR", () => {
    expect(getCardDefinition("BT1-035")).toMatchObject({
      cardId: "BT1-035",
      set: "BT1",
      nameEn: "Leomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beastkin"],
      effectText: "[On Deletion] Gain 2 memory.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-035",
      nameJp: "レオモン",
    });
    expect(getCardDefinition("BT1-035")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-035")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [{ trigger: "OnDeletion", actions: [{ kind: "GainMemory", amount: 2 }] }],
      coverage: "full",
      residual: [],
    });
  });

  it("gains 2 memory when deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-035", as: "leomon", dp: 1000, suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 20000 }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("leomon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.memory === -2);
    expect(s.state.memory).toBe(-2);
  });

  it("does not gain memory when another Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-035", as: "leomon" }] },
      1: { battleArea: [{ card: "BT1-016", as: "other" }] },
    });
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("digivolves from a blue level 3 for 2 memory and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "base" }],
        hand: [{ card: "BT1-035", as: "leomon" }],
        deck: [{ card: "BT1-030", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("leomon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-029"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-030");
  });

  it("rejects evolution from a red level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT1-035", as: "leomon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});

describe("BT1-035 Leomon — KB Q&A rulings", () => {
  const setupOpponentAttackOnLeomon = (opponentMemory: number) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-035", as: "leomon", dp: 1000, suspended: true }],
        deck: ["BT1-010", "BT1-011"],
        security: ["BT1-012"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "attacker", dp: 20000 }],
        hand: ["BT1-010"],
        deck: ["BT1-013", "BT1-014"],
        security: ["BT1-015"],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = opponentMemory;
    return s;
  };
  const attackLeomon = (s: ReturnType<typeof setupOpponentAttackOnLeomon>) =>
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("leomon").permanentId },
    });

  it("ends the opponent's turn after the attack resolves when its deletion moves memory to 1 on its controller's side (Q892)", async () => {
    const s = setupOpponentAttackOnLeomon(1);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(attackLeomon(s)).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await turn;

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(-1);
    const turnEnded = s.events.findIndex((event) => event.kind === "turnEnded");
    expect(s.events[turnEnded]).toMatchObject({ endingSeat: 1, nextSeat: 0 });
    const leomonMemory = s.events.findIndex((event) => event.kind === "memoryChanged" && event.to === -1);
    const combatResolved = s.events.findIndex((event) => event.kind === "combatResolved");
    expect(leomonMemory).toBeGreaterThanOrEqual(0);
    expect(combatResolved).toBeGreaterThanOrEqual(0);
    expect(leomonMemory).toBeLessThan(turnEnded);
    expect(combatResolved).toBeLessThan(turnEnded);
    expect(s.perm("attacker").isSuspended).toBe(true);

    const control = setupOpponentAttackOnLeomon(3);
    const controlTurn = control.engine.runOneTurn();
    await advance(control.engine).waitForMainPhase(1);
    expect(attackLeomon(control)).toEqual({ ok: true });
    await advance(control.engine).finishAttack();
    await advance(control.engine).waitForMainPhase(1);
    expect(control.state.memory).toBe(1);
    expect(control.events.some((event) => event.kind === "turnEnded")).toBe(false);
    advance(control.engine).endMainPhaseIfOpen(1);
    await controlTurn;
  });
});
