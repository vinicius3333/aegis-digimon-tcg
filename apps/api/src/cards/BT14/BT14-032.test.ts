import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-032.js";

describe("BT14-032", () => {
  it("on play returns a security card to hand and may place a Sukamon from hand as security", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "SecurityManipulation", op: "toHand" }, { kind: "SecurityManipulation", op: "placeAsSecurity", source: { filter: { nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }] } } }] }));
  it("inherits -3000 DP to an opposing Digimon on deletion", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }] }));

  it("returns a security card and places a Sukamon from hand as security", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT14-032", as: "chuumon" }, { card: "BT14-034", as: "sukamon" }], security: ["BT1-001"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chuumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT14-034"));
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT14-034")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
