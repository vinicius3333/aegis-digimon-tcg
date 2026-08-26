import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-046.js";

describe("BT11-046 Agumon", () => {
  it("maps its green rookie catalog facts and reveal/aura clauses", () => {
    expect(getCardDefinition("BT11-046")).toMatchObject({ cardId: "BT11-046", colors: ["Green"], level: 3, playCost: 3, dp: 1000, types: ["Reptile"] });
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom" }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 2000 } }] });
  });

  it("reveals 4, adds a Tamer to hand and bottom-decks the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-046", as: "agumon" }],
          deck: [
            { card: "BT11-091", as: "tamer" },
            { card: "BT1-064", as: "rest1" },
            { card: "BT1-065", as: "rest2" },
            { card: "BT1-066", as: "rest3" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("tamer").instanceId));

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("rest1").instanceId, s.inst("rest2").instanceId, s.inst("rest3").instanceId]),
    );
  });

  it("inherited effect gives its host +2000 DP on its turn while a Tamer is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-065", as: "host", under: ["BT11-046"] }, "BT1-086"],
      },
    });

    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(6000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });
});
import { getCardDefinition } from "@aegis/shared";
