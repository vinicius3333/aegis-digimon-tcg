import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT19-068.js";

describe("BT19-068", () => {
  it("preserves Twilight/Composite reveal, Nene play, self placement, and Composite trait", () => {
    const card = runtimeCompiledCard("BT19-068");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [{ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }], rest: "trash" }],
      },
      {
        trigger: "OnDeletion",
        actions: [
          { kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true },
          {
            kind: "PlaceUnder",
            underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
            optional: true,
          },
        ],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Composite"] }] },
    ]);
  });

  it("resolves the On Play reveal from a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-068", as: "shade" }],
          deck: ["BT19-068", "BT19-030", "BT19-031"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shade").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT19-068"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-068");
  });
});
