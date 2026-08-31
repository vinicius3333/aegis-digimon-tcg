import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST24-09 Sunflowmon", () => {
  it("may suspend an opposing Digimon or Tamer, then places the deck top face down under a DATA SQUAD Tamer", () => {
    const compiled = registeredCompiledCards.get("ST24-09") ?? getCompiledCard("ST24-09")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)?.actions;
      expect(actions?.[0]).toMatchObject({
        kind: "Suspend",
        optional: true,
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
      });
      expect(actions?.[1]).toMatchObject({
        kind: "PlaceUnder",
        fromDeckTop: true,
        optional: true,
        underFilter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
    });
  });

  it("suspends the chosen opponent and places the deck top face down under the Tamer on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-13", as: "tamer" }],
          hand: [{ card: "ST24-09", as: "sunflowmon" }],
          deck: [{ card: "BT1-001", as: "deckTop" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const deckTopId = s.inst("deckTop").instanceId;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sunflowmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === deckTopId));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("tamer").stack).toContainEqual(expect.objectContaining({ instanceId: deckTopId, faceUp: false }));
  });
});
