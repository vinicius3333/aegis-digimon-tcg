import { digiXrosRequirementFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

const SAVE_MATERIALS = ["BT12-048", "BT12-074", "BT12-075", "EX10-015"];
const XROS_HEART_MATERIALS = ["BT12-011", "BT12-063"];
const BAGRA_ARMY_MATERIALS = ["EX10-026", "EX10-027"];

const ONE_MATERIAL_RECIPES: { cardId: string; pool: string[] }[] = [
  { cardId: "BT10-077", pool: BAGRA_ARMY_MATERIALS },
  { cardId: "BT10-111", pool: XROS_HEART_MATERIALS },
  { cardId: "BT11-086", pool: XROS_HEART_MATERIALS },
  { cardId: "BT12-011", pool: SAVE_MATERIALS },
  { cardId: "BT12-037", pool: SAVE_MATERIALS },
  { cardId: "BT12-048", pool: SAVE_MATERIALS },
  { cardId: "BT12-051", pool: SAVE_MATERIALS },
  { cardId: "BT12-063", pool: SAVE_MATERIALS },
  { cardId: "BT12-074", pool: SAVE_MATERIALS },
  { cardId: "BT12-075", pool: SAVE_MATERIALS },
  { cardId: "EX10-015", pool: SAVE_MATERIALS },
];

describe('Discord bug 1555207678542876682 sweep: a printed "1 Digimon card" DigiXros recipe takes one material', () => {
  for (const { cardId, pool } of ONE_MATERIAL_RECIPES) {
    const [first, second] = pool.filter((materialId) => materialId !== cardId);

    it(`${cardId} caps the recipe at 1 material`, () => {
      expect(digiXrosRequirementFor(cardId)).toEqual([expect.objectContaining({ maxMaterials: 1 })]);
    });

    it(`${cardId} rejects a second material and accepts one`, async () => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: cardId, as: "played" },
              { card: first!, as: "first" },
              { card: second!, as: "second" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("played").instanceId,
          digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
      expect(s.state.players[0]!.battleArea).toHaveLength(0);

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("played").instanceId,
          digiXros: { materialInstanceIds: [s.inst("first").instanceId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === cardId));
      expect(s.perm("played").stack.map((card) => card.cardId)).toEqual([first]);
    });
  }
});
