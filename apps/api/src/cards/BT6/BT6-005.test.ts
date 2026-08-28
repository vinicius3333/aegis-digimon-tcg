import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-005.js";

describe("BT6-005 Pagumon", () => {
  it("adds a revealed black Digimon to hand when its host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-067", under: ["BT6-005"], as: "host" }],
          deck: [{ card: "BT5-059", as: "revealed" }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId)).toBe(true);
  });

  it("bottoms revealed cards that are not black Digimon", async () => {
    for (const revealedCard of ["BT1-010", "BT6-104"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT6-055", under: ["BT6-005"], as: "host" }],
            deck: [{ card: revealedCard, as: "revealed" }],
          },
        },
        { autoOrderTriggers: true, autoSelectCards: true },
      );
      await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
      await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("revealed").instanceId));
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId)).toBe(false);
      expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("revealed").instanceId);
    }
  });
});
