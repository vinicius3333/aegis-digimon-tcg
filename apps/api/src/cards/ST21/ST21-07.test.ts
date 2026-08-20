import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-07", () => {
  it("requires trashing one Adventure card before drawing two", () => {
    expect(getCardDefinition("ST21-07")?.effectText).toContain("By trashing 1 card");
    const a = runtimeCompiledCard("ST21-07")?.effects.find(x => x.trigger === "OnPlay")?.actions[0];
    expect(a).toMatchObject({ kind: "Draw", amount: 2, optional: true, abortOnDecline: true, cost: { kind: "trash", target: { count: 1 } } });
  });
  it("gives the host permanent inherited DP", () => {
    const e = runtimeCompiledCard("ST21-07")?.effects.find(x => x.isInherited);
    expect(e).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { isSelf: true } }] });
  });

  it("trashes one Adventure card as cost, then draws exactly two cards", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST21-07", as: "palmon" }, { card: "ST21-13", as: "adventure" }], deck: ["BT1-001", "BT1-002"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palmon").instanceId })).toEqual({ ok: true });
    await settle(() => {
      const hand = (s.state.players[0] as PlayerState).hand.map((card) => card.cardId);
      return hand.includes("BT1-001") && hand.includes("BT1-002");
    });

    expect((s.state.players[0] as PlayerState).trash.filter((card) => card.cardId === "ST21-13")).toHaveLength(1);
    expect((s.state.players[0] as PlayerState).hand.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
  });
});
