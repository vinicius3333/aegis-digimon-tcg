import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-007.js";

describe("BT11-007 Biyomon", () => {
  it("reveals three, adds the required red Vaccine Digimon and red Tamer, and bottoms the rest", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT11-007", as: "biyomon" }],
        deck: ["BT1-009", "BT1-085", "BT11-007"],
      },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("biyomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-085"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT11-007"]);
  });

  it("gains 1 memory on its host's deletion while a red Tamer remains", async () => {
    const s = setupEngine({
      0: { battleArea: [
        { card: "BT1-015", as: "host", under: ["BT11-007"] },
        "BT1-085",
      ] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.memory).toBe(1);
  });
});
