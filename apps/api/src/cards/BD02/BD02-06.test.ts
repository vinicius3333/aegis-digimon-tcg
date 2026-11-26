import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { drainMicrotasks, settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "BD02-06";
const vanillaBlackLevel4 = "BT2-056";
const vanillaBlueLevel5 = "BT1-038";
const playCostTwo = "BT1-027";
const playCostFour = "BT1-071";
const playCostFive = "BT1-038";

async function digivolveIntoAndromon(opponentBattleArea: PermanentSpec[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: vanillaBlackLevel4, as: "base" }],
        hand: [{ card: cardId, as: "andromon" }],
      },
      1: { battleArea: opponentBattleArea },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 3;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("andromon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard?.cardId === cardId && s.state.pendingDecision === undefined);
  await drainMicrotasks(40);
  return s;
}

const opponentBoard = (s: ReturnType<typeof setupEngine>) =>
  s.state.players[1]!.battleArea.map((permanent) => permanent.topCard!.cardId);

describe("BD02-06 Andromon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD02",
      nameEn: "Andromon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
      rarity: "C",
      effectText: "[When Digivolving] Delete 1 of your opponent's Digimon with a play cost of 4 or less.",
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("deletes an opposing Digimon with a play cost of exactly 4 and spares a play cost 5 Digimon", async () => {
    const s = await digivolveIntoAndromon([
      { card: playCostFour, as: "costFour" },
      { card: playCostFive, as: "costFive" },
    ]);

    expect(opponentBoard(s)).toEqual([playCostFive]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([playCostFour]);
    expect(s.state.memory).toBe(0);
  });

  it("deletes nothing when every opposing Digimon costs more than 4", async () => {
    const s = await digivolveIntoAndromon([{ card: playCostFive, as: "costFive" }]);

    expect(opponentBoard(s)).toEqual([playCostFive]);
  });

  it("deletes a cheaper opposing Digimon", async () => {
    const s = await digivolveIntoAndromon([{ card: playCostTwo, as: "costTwo" }]);

    expect(opponentBoard(s)).toEqual([]);
  });

  it("gives its host +1000 DP on both players' turns as an inherited effect", async () => {
    for (const turnSeat of [0, 1] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: vanillaBlueLevel5, as: "host", under: [cardId] }] } });
      s.state.turnSeat = turnSeat;
      await s.ready();

      expect(s.perm("host").currentDP).toBe(7000);
    }
  });

  it("does not boost itself while Andromon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "andromon", under: [vanillaBlackLevel4] }] } });
    await s.ready();

    expect(s.perm("andromon").currentDP).toBe(6000);
  });
});
