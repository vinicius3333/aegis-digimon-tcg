import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT13-061.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-061 Gotsumon", () => {
  it("keeps Blocker and opponent-turn black-card reveal", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Blocker" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ filter: { controllerDefault: "mine", colors: ["Black"] }, count: 1, to: "hand" }],
          rest: "deckBottomAnyOrder",
          condition: { kind: "isOpponentsTurn" },
        },
      ],
    });
  });

  it("exposes Blocker on the live Gotsumon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-061", as: "gotsu" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gotsu"), "Blocker")).toBe(true);
  });

  it("reveals three, adds one black card, and bottoms the other revealed cards on opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-061", as: "gotsu" }],
          deck: ["BT13-067", "BT13-036", "BT13-034", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT13-036", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("gotsu").permanentId]);
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT13-067"));

    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT13-067")).toBe(true);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT13-036")).toBe(false);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT13-034")).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("does not reveal cards when Gotsumon is deleted on its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-061", as: "gotsu" }], deck: ["BT13-067", "BT13-036", "BT13-034"] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("gotsu").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
