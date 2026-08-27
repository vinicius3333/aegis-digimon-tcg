import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-009.js";

describe("BT17-009", () => {
  it("reveals three and adds a Hybrid/Ten Warriors card or inherited-effect Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand" },
            { count: 1, to: "hand" },
          ],
        },
      ],
    });
  });

  it("plays an inherited-effect Tamer from hand on deletion as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    });
  });

  it("adds one Hybrid and one eligible Tamer from the top three", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT17-009", as: "flamemon" }], deck: ["BT17-023", "BT17-083", "BT1-009"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flamemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT17-023"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-023", "BT17-083"]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
