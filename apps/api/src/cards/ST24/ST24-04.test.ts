import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST24-04 Agumon", () => {
  it("reveals 3, adds and places DATA SQUAD cards, and returns the rest to deck bottom", () => {
    const compiled = registeredCompiledCards.get("ST24-04") ?? getCompiledCard("ST24-04")!;
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] } },
          {
            count: 1,
            to: "placeUnder",
            faceDown: true,
            underFilter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });

  it("resolves both reveal dispositions against a real DATA SQUAD Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-13", as: "tamer" }],
          hand: [{ card: "ST24-04", as: "agumon" }],
          deck: [
            { card: "ST24-02", as: "firstDataSquad" },
            { card: "ST24-03", as: "secondDataSquad" },
            { card: "BT1-090", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const firstId = s.inst("firstDataSquad").instanceId;
    const secondId = s.inst("secondDataSquad").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.length === 1);

    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const underIds = s.perm("tamer").stack.map(({ instanceId }) => instanceId);
    expect([...handIds, ...underIds]).toEqual(expect.arrayContaining([firstId, secondId]));
    expect(s.perm("tamer").stack[0]).toMatchObject({ faceUp: false });
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("rest").instanceId);
  });
});
