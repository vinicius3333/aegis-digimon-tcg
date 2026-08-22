import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-110.js";

describe("BT5-110 All Delete", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-110")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("returns an Omnimon, trashes its sources, and deletes every remaining Digimon and Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-086", as: "omnimon", under: [{ card: "BT5-007", as: "bottom" }, { card: "BT5-019", as: "upper" }] }, "BT5-059", "BT5-091"], hand: [{ card: "BT5-110", as: "option" }] }, 1: { battleArea: ["BT5-059", "BT5-091"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const omnimonTopId = s.perm("omnimon").topCard.instanceId;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(omnimonTopId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("bottom").instanceId, s.inst("upper").instanceId]));
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-110", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});
