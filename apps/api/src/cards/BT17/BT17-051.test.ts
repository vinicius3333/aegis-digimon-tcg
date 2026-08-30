import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-051.js";
import "./index.js";

describe("BT17-051 Argomon", () => {
  it("deletes any number of opposing Digimon by level budget, scaling from Argomon sources", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[1]).toMatchObject({
        kind: "DeleteLevelBudget",
        filter: { controller: "opponent", kind: ["Digimon"], hasLevel: true },
        baseBudget: 4,
        upTo: true,
        scaling: { per: 2, budgetAdd: 1, unit: "digivolutionCards" },
      });
    }
  });

  it("prevents opposing Tamers from unsuspending during the opponent's turn", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: "all" },
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
      whileMatchesTargetFilter: true,
    });
  });

  it("naturally places Argomon sources before applying the scaled level budget", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-051", as: "argomon" }],
          trash: [
            { card: "BT17-048", as: "sourceOne" },
            { card: "BT17-048", as: "sourceTwo" },
            { card: "BT17-048", as: "sourceThree" },
            { card: "BT17-048", as: "sourceFour" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT17-052", as: "levelThreeOne" },
            { card: "BT17-053", as: "levelThreeTwo" },
            { card: "BT17-054", as: "levelFour" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 15;
    const argomonId = s.inst("argomon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: argomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-051"));

    const argomon = s.perm("argomon");
    expect(argomon.stack).toHaveLength(4);
    expect(argomon.currentDP).toBe(15000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT17-054"]);
  });
});
