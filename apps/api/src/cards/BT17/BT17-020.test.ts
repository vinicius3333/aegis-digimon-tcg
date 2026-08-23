import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-020.js";

describe("BT17-020", () => {
  it("reveals three and adds a Hybrid/Ten Warriors or inherited-effect Tamer", () => {
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

  it("plays an inherited-effect Tamer from hand for 2 less as inherited once per turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 2, optional: true }],
    });
  });

  it("adds a Hybrid and an eligible Tamer from the top three", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT17-020", as: "strabimon" }], deck: ["BT17-023", "BT17-083", "BT1-009"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("strabimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT17-023"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-023", "BT17-083"]),
    );
  });
});
