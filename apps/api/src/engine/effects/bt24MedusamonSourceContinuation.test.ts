import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

const REPLACEMENT_CARD_ID = "EX10-052";

describe("BT24-017 Q6027 source-removal continuation", () => {
  it("continues the resolving effect after an immediate leave replacement removes Medusamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-016", as: "base" }],
          hand: [{ card: "BT24-017", as: "medusamon" }],
        },
        1: {
          battleArea: [{ card: REPLACEMENT_CARD_ID, as: "replacementTarget", dp: 1000 }],
          trash: [
            { card: "BT1-010", as: "trashA" },
            { card: "BT1-011", as: "trashB" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("medusamon").instanceId));
    await settle(
      () =>
        s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token")
          .length === 2,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-017")).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("replacementTarget").instanceId]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("trashA").instanceId, s.inst("trashB").instanceId]),
    );
    expect(
      s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token"),
    ).toHaveLength(2);
  });
});
