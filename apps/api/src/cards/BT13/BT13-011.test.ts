import "../ST1/ST1-10.js";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-011.js";
import "./BT13-014.js";

describe("BT13-011 Aquilamon", () => {
  it("on play deletes one opposing Digimon at or below 3000 DP but not a 4000 DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT13-011", as: "aquilamon" }] },
        1: {
          battleArea: [
            { card: "BT1-012", as: "small" },
            { card: "BT1-015", as: "large" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-015");
    expect(s.state.memory).toBe(5);
  });

  it("when digivolving deletes an opposing Digimon at or below 3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-012", as: "base" }],
          hand: [{ card: "BT13-011", as: "aquilamon" }],
          deck: [{ card: "BT1-010", as: "bonus" }],
        },
        1: { battleArea: [{ card: "BT1-012", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aquilamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("base").topCard.cardId).toBe("BT13-011");
    await settle();
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
  });

  it("draws one when the Digimon carrying its inherited effect is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-014", as: "host", under: ["BT13-011"] }], deck: ["BT1-010"] },
      1: { battleArea: [{ card: "ST1-10", as: "phoenix", suspended: true }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("phoenix").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });
});
