import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-057.js";

describe("BT23-057 Gankoomon", () => {
  it("plays Hinukamuy first and counts another own Digimon toward the deletion ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-057", as: "gankoomon" },
            { card: "BT23-061", as: "other" },
          ],
        },
        1: { battleArea: [{ card: "BT23-067", as: "cost7" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("cost7").permanentId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("gankoomon").permanentId });
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "TOKEN-Hinukamuy-Token");
    expect(token).toBeDefined();
    expect(token?.currentDP).toBe(6000);
    expect(Array.from(token?.grantedKeywords ?? [])).toEqual(expect.arrayContaining(["Alliance", "Reboot", "Blocker"]));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it("reduces its play cost by 5 by returning exactly three matching cards from trash to the top or bottom of the deck", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      mode: "reduceCost",
      amount: 5,
      cost: {
        kind: "return",
        to: "deckTopOrBottom",
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Huckmon", "Sistermon", "Jesmon"], match: "name" }],
          },
          count: 3,
        },
      },
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays Hinukamuy optionally, then deletes an opposing Digimon with play cost 6 or less plus 3 per other Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "PlayToken",
        tokens: [
          {
            name: "Hinukamuy Token",
            keywords: [{ keyword: "Alliance" }, { keyword: "Reboot" }, { keyword: "Blocker" }],
          },
        ],
        count: 1,
        optional: true,
        payCost: false,
      });
      expect(actions[1]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", playCostLte: 6 }, count: 1 },
        playCostCeiling: {
          base: 6,
          raise: 3,
          per: 1,
          unit: "cards",
          filter: { excludeSelf: true, kind: ["Digimon"] },
        },
        optional: false,
      });
    }
  });
});
