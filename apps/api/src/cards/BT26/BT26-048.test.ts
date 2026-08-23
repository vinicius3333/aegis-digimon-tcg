import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-048.js";
import "../index.js";

describe("BT26-048 BloomLordmon", () => {
  it("encodes Alliance/Vortex, the face-down stack cost and batch trash reaction", () => {
    expect(digivolutionRequirementsFor("BT26-048")).toContainEqual({
      level: 5,
      traits: ["DM"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]?.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Alliance" }),
        expect.objectContaining({ keyword: "Vortex" }),
      ]),
    );
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((e) => e.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashDigivolution", fromTop: false },
          { kind: "PlayWithoutCost", payCost: false },
        ],
      });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          actions: [{ kind: "ModifyDP", amount: -6000 }],
        },
      ],
    });
  });

  it("publicly trashes a bottom face-down card, plays an eligible Ver.4 Digimon, and debuffs an opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-048", as: "bloomLordmon" },
            { card: "BT1-009", as: "host", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
          ],
          hand: [{ card: "BT26-023", as: "ver4" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bloomLordmon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-023");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).not.toContain("BT1-010");
    expect(s.perm("opponent").currentDP).toBe(4000);
  });
});
