import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-076.js";
import "../index.js";

describe("BT26-076 Crowmon", () => {
  it("models the delete-plus-Tamer cost and both once-per-turn reactions", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [
            expect.objectContaining({
              kind: "Delete",
              target: {
                filter: { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
                count: 1,
              },
            }),
            expect.objectContaining({
              kind: "Trash",
              chooser: "opponent",
              cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({ kind: "SubTrigger", event: "whenHandTrashed", frequency: "OncePerTurn" }),
            expect.objectContaining({ kind: "SubTrigger", event: "whenDigivolutionTrashed", frequency: "OncePerTurn" }),
          ]),
        }),
      ]),
    );
  });

  it("publicly deletes a level 4 opponent Digimon and trashes a face-down Tamer card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-076", as: "crowmon" },
          { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }], hand: [{ card: "BT1-011", as: "discarded" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("crowmon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-011");
  });
});
