import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-062.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT14-062", () => {
  it("prevents opponent effects from deleting this card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "beDeleted",
      duration: "permanent",
      byOpponentEffectsOnly: true,
    }));

  it("survives a natural opponent Option deletion effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-062", as: "datamon" }] },
        1: { hand: [{ card: "ST14-12", as: "deletionOption" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deletionOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "ST14-12"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-062")).toBe(true);
  });
});
