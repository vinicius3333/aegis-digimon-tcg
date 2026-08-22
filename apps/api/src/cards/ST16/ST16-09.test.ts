import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-09.js";

describe("ST16-09 Pumpkinmon", () => {
  it("may play a purple level 3 Digimon from its owner's trash without paying", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST16-09", as: "pumpkinmon" }],
          trash: [{ card: "ST16-05", as: "trashRookie" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pumpkinmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST16-05"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["ST16-09", "ST16-05"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST16-05")).toBe(false);
  });
});
