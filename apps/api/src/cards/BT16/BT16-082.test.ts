import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT16-082 Ukkomon", () => {
  it("reveals three, adds one Digimon or Tamer, bottoms the rest, and may hatch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-082", as: "ukkomon" }],
          breeding: { card: "BT1-009", as: "bred" },
          deck: ["BT1-086", "BT1-001", "BT1-002"],
          eggDeck: [{ card: "BT1-001", as: "egg" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const deckIds = s.state.players[0]!.deck.map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: s.perm("bred").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-086"));
    await settle(() => false, 40);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-086")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.eggDeck).toHaveLength(2);
    expect(s.state.players[0]!.eggDeck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-002"]),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-001");
    expect(deckIds).toHaveLength(3);
    assertNoLoudGap(s);
  });
});
