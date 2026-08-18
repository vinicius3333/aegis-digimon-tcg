import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-206.js";

describe("P-206 Digimon Liberator", () => {
  it("can be used without a matching color source or a separate waiver prompt", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-206", as: "option" }],
        deck: ["BT1-009", "BT1-085", "BT1-095"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 4;
    await s.ready();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.cardId === "P-206",
    ));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-085"]),
    );
  });
});
