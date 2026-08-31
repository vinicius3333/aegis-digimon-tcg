import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-201.js";

describe("P-201 Phascomon", () => {
  it("reveals three, adds a Belphemon/Gizmon-text card, bottoms the rest, then trashes a hand card", () => {
    const card = runtimeCompiledCard("P-201")!;
    for (const trigger of ["OnPlay", "OnDeletion"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            rest: "deckBottom",
            add: [
              {
                count: 1,
                to: "hand",
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["Belphemon", "Gizmon"], match: "text" }],
                },
              },
            ],
          },
          { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
        ],
      });
    }
  });

  it("requires Kapurimon for zero-cost evolution and inherits the hand-trash suspension effect", () => {
    const card = runtimeCompiledCard("P-201")!;
    expect(card.digivolutionRequirement).toEqual([{ names: ["Kapurimon"], cost: 0, isAlternate: true }]);
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Suspend",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
        },
      ],
    });
  });

  it("reveals three, adds a Belphemon-text card, and trashes a hand card on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-201", as: "source" },
            { card: "BT1-001", as: "filler" },
          ],
          deck: [{ card: "BT13-084", as: "match" }, "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("filler").instanceId)).toBe(true);
  });
});
