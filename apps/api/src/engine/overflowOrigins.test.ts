import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT20/index.js";

describe("Overflow source areas", () => {
  it("does not charge Overflow when a public search returns an unselected ACE to the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-030", as: "searcher" }],
          deck: [{ card: "BT20-045", as: "ace" }, "BT20-010", "BT20-012", "BT20-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("searcher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT20-030"));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT20-009",
      "BT20-045",
      "BT20-010",
      "BT20-012",
    ]);
    expect(s.state.memory).toBe(7);
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(0);
  });

  for (const zone of ["hand", "deck", "trash", "security"] as const) {
    for (const destination of ["hand", "deck"] as const) {
      it(`does not charge Overflow for an ACE moving from ${zone} to ${destination}`, async () => {
        const s = setupEngine({ 0: { [zone]: [{ card: "BT20-045", as: "ace" }] } });
        s.state.memory = 5;
        // Isolate the shared return verb's area boundary; the public search above covers its caller.
        if (destination === "hand") await advance(s.engine).verb.returnToHand([s.inst("ace").instanceId]);
        else await advance(s.engine).verb.returnToDeck([s.inst("ace").instanceId]);
        expect(s.state.players[0]![destination].map((card) => card.instanceId)).toEqual([s.inst("ace").instanceId]);
        expect(s.state.memory).toBe(5);
      });
    }
  }

  for (const destination of ["hand", "deck"] as const) {
    it(`charges Overflow when a source ACE leaves an evolution stack for ${destination}`, async () => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT20-102", as: "host", under: [{ card: "BT20-045", as: "ace" }] }] },
      });
      s.state.memory = 5;
      if (destination === "hand") await advance(s.engine).verb.returnToHand([s.inst("ace").instanceId]);
      else await advance(s.engine).verb.returnToDeck([s.inst("ace").instanceId]);
      expect(s.perm("host").stack).toHaveLength(0);
      expect(s.state.players[0]![destination].map((card) => card.instanceId)).toEqual([s.inst("ace").instanceId]);
      expect(s.state.memory).toBe(0);
    });
  }
});
