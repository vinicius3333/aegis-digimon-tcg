import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-028.js";

describe("BT18-028 AncientMegatheriummon", () => {
  it("trashes bottom sources and restricts only opposing Digimon left without sources", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "TrashDigivolution", amount: 2, fromTop: false }, { kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "Replacement", event: "wouldLeavePlay" }] });
    const s = setupEngine({ 0: { hand: [{ card: "BT18-028", as: "ancient" }] }, 1: { battleArea: [{ card: "BT1-030", as: "empty" }, { card: "BT1-030", as: "stacked", under: ["BT18-021", "BT18-022", "BT18-023"] }] } }, { autoSelectCards: true });
    s.state.memory = 20;
    const emptyId = s.perm("empty").permanentId;
    const stackedId = s.perm("stacked").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(emptyId, "suspend"));
    expect(s.perm("stacked").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(emptyId, "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(stackedId, "suspend")).toBe(false);
  });
});
