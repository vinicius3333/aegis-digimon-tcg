import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-15", () => {
  it("buffs level 3+ Digimon by 3000 DP while this card is face-up security", () => {
    const effect = (runtimeCompiledCard("ST21-15")?.effects ?? []).find((candidate) => candidate.trigger === "YourTurn");
    expect(effect).toMatchObject({ isSecurity: true });
    expect(effect?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 3000 });
  });
  it("exchanges the bottom security card for this card and can play a level 3 from trash", () => {
    const effects = runtimeCompiledCard("ST21-15")?.effects ?? [];
    expect(effects.find((effect) => effect.trigger === "Main")?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "SecurityManipulation", op: "toHand" }),
      expect.objectContaining({ kind: "SecurityManipulation" }),
    ]));
    expect(effects.find((effect) => effect.trigger === "Security")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"] });
  });

  it("plays a level-3 Digimon from trash when revealed from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST21-15", as: "house" }], trash: [{ card: "ST1-03", as: "rookie" }] },
      1: { battleArea: [{ card: "ST1-03", as: "attacker" }], security: ["BT1-001"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("rookie").instanceId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("rookie").instanceId)).toBe(true);
  });

  it("adds the bottom security card to hand and replaces it with Gennai's House face up", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT10-093", "BT10-012", "BT10-085"],
        hand: [{ card: "ST21-15", as: "house" }],
        security: [{ card: "BT1-001", as: "bottom" }, { card: "BT1-002", as: "top" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("house").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001", "ST21-15"]);
    const house = s.state.players[0]!.security.find((card) => card.cardId === "ST21-15");
    expect(house?.faceUp).toBe(true);
  });
});
