import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-011.js";

describe("BT13-011 Aquilamon", () => {
  it("on play deletes one opposing Digimon at or below 3000 DP but not a 4000 DP Digimon", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-011", as: "aquilamon" }] }, 1: { battleArea: [{ card: "BT1-012", as: "small" }, { card: "BT1-015", as: "large" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-015");
  });

  it("when digivolving deletes an opposing Digimon at or below 3000 DP", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-012", as: "base" }], hand: [{ card: "BT13-011", as: "aquilamon" }] }, 1: { battleArea: [{ card: "BT1-012", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("aquilamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("base").topCard.cardId).toBe("BT13-011");
  });

  it("draws one when the Digimon carrying its inherited effect is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-011"] }], deck: ["BT1-001"] } });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });
});
