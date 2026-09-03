import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT19-066.js";

describe("BT19-066", () => {
  it("preserves the optional Composite/Wicked God hand cost and inherited Blocker", () => {
    const card = runtimeCompiledCard("BT19-066");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 2,
            cost: {
              kind: "trash",
              target: {
                filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Composite", "Wicked God"] }] },
              },
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] },
    ]);
  });

  it("resolves the hand cost and Draw 2 from a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-066", as: "giza" },
            { card: "BT19-068", as: "cost" },
          ],
          deck: ["BT19-030", "BT19-031"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giza").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-068")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT19-030", "BT19-031"]),
    );
  });
});
