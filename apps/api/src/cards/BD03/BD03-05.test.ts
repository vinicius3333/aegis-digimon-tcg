import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "BD03-05";
const galemon = "BD03-04";
const pteromon = "BD03-03";
const zephagamon = "BD03-07";
const vanillaLevel3 = "BT1-009";

describe("BD03-05 GrandGalemon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD03",
      nameEn: "GrandGalemon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Bird Dragon", "Vortex Warriors"],
      rarity: "U",
      effectText: "[When Digivolving] This Digimon gets +2000 DP until your opponent's turn ends.",
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("digivolves from Galemon for 3 memory and gets +2000 DP until the opponent's turn ends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: galemon, as: "base", under: [pteromon] }],
        hand: [{ card: cardId, as: "grandGalemon" }],
        deck: [vanillaLevel3, vanillaLevel3, vanillaLevel3],
        security: [vanillaLevel3, vanillaLevel3],
      },
      1: { deck: [vanillaLevel3, vanillaLevel3, vanillaLevel3], security: [vanillaLevel3, vanillaLevel3] },
    });
    s.state.memory = 5;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const memoryAtMain = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grandGalemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 9000);

    expect(s.perm("base").topCard.cardId).toBe(cardId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([pteromon, galemon]);
    expect(s.state.memory).toBe(memoryAtMain - 3);
    expect(s.perm("base").currentDP).toBe(9000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).recompute();

    expect(s.perm("base").currentDP).toBe(9000);

    await advance(s.engine).runTurn(1);
    await advance(s.engine).recompute();

    expect(s.perm("base").currentDP).toBe(7000);
  });

  it("gives its host +1000 DP on both turns", async () => {
    for (const turnSeat of [0, 1] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: zephagamon, as: "host", under: [cardId] }] } });
      s.state.turnSeat = turnSeat;
      await s.ready();

      expect(s.perm("host").currentDP).toBe(13000);
    }
  });

  it("gives no inherited bonus to itself as the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "grandGalemon", under: [galemon] }] } });
    await s.ready();

    expect(s.perm("grandGalemon").currentDP).toBe(7000);
  });
});
