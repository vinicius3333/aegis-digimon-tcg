import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-011.js";
import "../index.js";

describe("EX9-011", () => {
  it("reduces its play cost by trashing a Cyborg or Ver.1 card and places a trash Digimon underneath when deleting opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      actions: [{ mode: "reduceCost", amount: 2, cost: { kind: "trash" } }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      optional: true,
      target: { totalDpCap: 5000 },
      totalDpCapScaling: { unit: "selfFaceDownDigivolutionCards", amount: 2000 },
      cost: { kind: "place", destination: "digivolutionStack", faceDown: true },
    });
  });

  it("scales the deletion limit only from face-down digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-011",
              as: "source",
              under: [
                { card: "EX9-009", faceUp: true },
                { card: "EX9-010", faceUp: true },
              ],
            },
          ],
          trash: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.decisions.length === 0);

    expect(s.perm("source").stack).toHaveLength(3);
    expect(s.perm("source").stack.some((card) => card.cardId === "BT1-009" && card.faceUp === false)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(true);
  });
});
