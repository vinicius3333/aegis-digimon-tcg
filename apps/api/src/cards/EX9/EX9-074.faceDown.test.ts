import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-074 face-down digivolution information", () => {
  it("does not count a face-down color for all-turns DP scaling", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX9-074",
            as: "source",
            under: [
              { card: "BT1-009", faceUp: false },
              { card: "BT1-027", faceUp: true },
            ],
          },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();
    expect(s.perm("source").currentDP).toBe(11000);
  });

  it("does not use face-down colors for the six-color deletion branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-074",
              as: "source",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-027", faceUp: false },
                { card: "BT1-045", faceUp: false },
                { card: "BT1-064", faceUp: false },
                { card: "BT10-058", faceUp: false },
                { card: "BT10-071", faceUp: false },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "red" },
            { card: "BT1-027", as: "blue" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-009", "BT1-027"]);
  });
});
