import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX5-007.js";
import "./EX5-008.js";
import "./EX5-012.js";
import "./EX5-013.js";
import "./EX5-014.js";
import "./EX5-016.js";
import "./EX5-017.js";
import "./EX5-020.js";
import "./EX5-024.js";
import "./EX5-025.js";
import "./EX5-034.js";
import "./EX5-041.js";
import "./EX5-043.js";
import "./EX5-053.js";
import "./EX5-054.js";
import "./EX5-061.js";
import "./EX5-074.js";

const cases: ReadonlyArray<{ card: string; base: string; invalidBase: string; cost: number; zone?: "breeding" }> = [
  { card: "EX5-007", base: "BT22-006", invalidBase: "EX5-006", cost: 0, zone: "breeding" },
  { card: "EX5-008", base: "BT16-029", invalidBase: "BT1-045", cost: 2 },
  { card: "EX5-012", base: "BT16-020", invalidBase: "BT11-081", cost: 3 },
  { card: "EX5-013", base: "EX5-050", invalidBase: "BT9-063", cost: 3 },
  { card: "EX5-014", base: "BT22-073", invalidBase: "BT10-079", cost: 4 },
  { card: "EX5-016", base: "BT22-006", invalidBase: "EX5-006", cost: 0, zone: "breeding" },
  { card: "EX5-017", base: "BT16-029", invalidBase: "BT1-045", cost: 2 },
  { card: "EX5-020", base: "BT22-072", invalidBase: "BT11-081", cost: 3 },
  { card: "EX5-024", base: "EX5-050", invalidBase: "BT9-063", cost: 3 },
  { card: "EX5-025", base: "BT22-073", invalidBase: "BT10-079", cost: 4 },
  { card: "EX5-034", base: "BT9-063", invalidBase: "EX5-050", cost: 3 },
  { card: "EX5-041", base: "EX5-050", invalidBase: "BT9-063", cost: 3 },
  { card: "EX5-043", base: "BT13-058", invalidBase: "EX5-043", cost: 1 },
  { card: "EX5-053", base: "EX5-037", invalidBase: "BT4-057", cost: 3 },
  { card: "EX5-054", base: "BT3-070", invalidBase: "BT4-083", cost: 3 },
  { card: "EX5-061", base: "BT4-083", invalidBase: "EX5-061", cost: 0 },
  { card: "EX5-074", base: "BT7-055", invalidBase: "EX5-055", cost: 4 },
];

describe("EX5 alternate digivolution requirements", () => {
  it.each(cases)(
    "publicly enforces $card's alternate route and cost",
    async ({ card, base, invalidBase, cost, zone }) => {
      const setup = (baseCard: string) =>
        setupEngine(
          {
            0:
              zone === "breeding"
                ? {
                    breeding: { card: baseCard, as: "base" },
                    hand: [{ card, as: "evolution" }],
                    deck: ["BT1-009"],
                  }
                : {
                    battleArea: [{ card: baseCard, as: "base" }],
                    hand: [{ card, as: "evolution" }],
                    deck: ["BT1-009"],
                  },
          },
          { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
        );

      const legal = setup(base);
      legal.state.memory = 10;
      await legal.ready();
      expect(
        legal.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: legal.perm("base").permanentId,
          instanceId: legal.inst("evolution").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => legal.perm("base").topCard?.cardId === card);
      expect(legal.perm("base").stack.map(({ cardId }) => cardId)).toEqual([base]);
      expect(legal.state.memory).toBe(10 - cost);
      expect(
        legal.state.players[0]!.hand.some(({ instanceId }) => instanceId === legal.inst("evolution").instanceId),
      ).toBe(false);

      const illegal = setup(invalidBase);
      illegal.state.memory = 10;
      await illegal.ready();
      expect(
        illegal.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: illegal.perm("base").permanentId,
          instanceId: illegal.inst("evolution").instanceId,
          useAlternateCost: true,
        }).ok,
      ).toBe(false);
      expect(illegal.perm("base").topCard?.cardId).toBe(invalidBase);
      expect(illegal.perm("base").stack).toHaveLength(0);
      expect(illegal.state.memory).toBe(10);
      expect(illegal.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([card]);
      expect(illegal.state.pendingDecision).toBeUndefined();
    },
  );
});
