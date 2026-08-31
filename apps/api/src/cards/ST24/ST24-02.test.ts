import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST24-02 Gaomon", () => {
  it("places exactly one hand card under a DATA SQUAD Tamer to draw 2", () => {
    const compiled = registeredCompiledCards.get("ST24-02") ?? getCompiledCard("ST24-02")!;
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 2,
          optional: true,
          cost: {
            kind: "place",
            target: { count: 1, from: ["hand"] },
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("places the paid hand card face down under the DATA SQUAD Tamer and draws two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-13", as: "tamer" }],
          hand: [
            { card: "ST24-02", as: "gaomon" },
            { card: "BT1-001", as: "cost" },
          ],
          deck: ["BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("cost").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === costId));

    expect(s.perm("tamer").stack).toContainEqual(expect.objectContaining({ instanceId: costId, faceUp: false }));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-002", "BT1-003"]),
    );
  });
});
