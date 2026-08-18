import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-102.js";

describe("BT4-102 Aqua Viper", () => {
  it("returns one own and up to two opposing level 4 stacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-023", as: "mine", under: [{ card: "BT4-022", as: "mineSource" }] }], hand: [{ card: "BT4-102", as: "option" }] }, 1: { battleArea: [{ card: "BT4-009", as: "first", under: [{ card: "BT4-001", as: "firstSource" }] }, { card: "BT4-026", as: "second", under: [{ card: "BT4-022", as: "secondSource" }] }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT4-023")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("mineSource").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("firstSource").instanceId, s.inst("secondSource").instanceId]));
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-102", as: "securityOption", faceUp: true }] } });
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });
});
