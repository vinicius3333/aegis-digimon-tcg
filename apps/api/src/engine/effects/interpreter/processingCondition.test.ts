import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../testkit/harness.js";
import "../../../cards/EX7/EX7-011.js";
import "../../../cards/index.js";

describe("§15-7-5 optional processing conditions", () => {
  it("pays an optional Delete condition before resolving its empty target", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-011", as: "megadramon" },
            { card: "EX7-071", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 7000, as: "tooLarge" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("megadramon").topCard?.cardId === "EX7-011");

    expect(s.state.memory).toBe(3);
    expect(s.perm("megadramon").stack.map((card) => card.cardId)).toEqual(["EX7-071"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("tooLarge").currentDP).toBe(7000);
  });
});
