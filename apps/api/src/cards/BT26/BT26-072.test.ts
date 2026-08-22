import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-072.js";
import "../index.js";

describe("BT26-072 Peckmon", () => {
  it("models both printed alternate costs", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["DATA SQUAD"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
          trigger: "OnPlay",
          actions: [
            {
              kind: "Modal",
              choose: 1,
              options: [
                [expect.objectContaining({ kind: "Delete", cost: expect.objectContaining({ kind: "trash" }) })],
                [
                  expect.objectContaining({
                    kind: "Delete",
                    cost: expect.objectContaining({
                      kind: "place",
                      faceDown: true,
                      position: "bottom",
                      underFilter: expect.objectContaining({ nameOrTrait: [{ tokens: ["Keenan Crier"], match: "name" }] }),
                    }),
                  }),
                ],
              ],
            },
          ],
        });
    expect(compiled.effects.some((effect) => effect.trigger === "WhenDigivolving")).toBe(true);
  });

  it("publicly pays the hand-trash alternative to delete an opponent's level 4 or lower Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-072", as: "peckmon" }], hand: [{ card: "BT1-001", as: "cost" }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("peckmon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
  });
});
