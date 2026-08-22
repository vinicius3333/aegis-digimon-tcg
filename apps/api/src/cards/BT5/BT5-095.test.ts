import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-095.js";

describe("BT5-095 Transcendent Sword", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-095")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("uses the normal 11000-DP ceiling without Omnimon or qualifying Greymon", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-007"], hand: [{ card: "BT5-095", as: "option" }] }, 1: { battleArea: [{ card: "BT5-046", as: "target", dp: 12000 }] } }, { autoSelectCards: true });
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("uses 15000 DP instead, as one deletion, when Omnimon is in play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine({ 0: { battleArea: ["BT5-086", "BT1-085"], hand: [{ card: "BT5-095", as: "option" }] }, 1: { battleArea: [{ card: "BT5-046", as: "high", dp: 14000 }, { card: "BT5-021", as: "low", dp: 3000 }] } }, { autoSelectCards: true, preferInstanceIds });
    preferInstanceIds.push(s.perm("high").topCard.instanceId);
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-095", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT5-046", as: "target", dp: 10000 }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
