import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-16.js";

describe("ST16-16 Baldy Blow", () => {
  it("deletes one opponent Digimon at level 5 or lower and leaves level 6 untouched", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST16-16", as: "option" }] },
        1: {
          battleArea: [
            { card: "ST16-11", as: "levelFive" },
            { card: "ST16-12", as: "levelSix" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST16-11"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["ST16-12"]);
  });
});
