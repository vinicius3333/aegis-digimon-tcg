import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-098.js";

describe("BT11-098 Maelstrom", () => {
  it("plays a blue source, then bottom-decks an opposing level 4 with Seadramon in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-085", as: "seadramon", under: [{ card: "BT1-029", as: "source" }] }],
          hand: [{ card: "BT11-098", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("source").instanceId) &&
        s.state.players[1]!.deck.some(({ cardId }) => cardId === "BT1-015"),
    );
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-015")).toBe(false);
  });
});
