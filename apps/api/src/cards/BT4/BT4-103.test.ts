import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-103.js";

describe("BT4-103 Full Moon Blaster", () => {
  it("returns a level 5 stack to hand while the opponent has fewer than 8 cards", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT4-023"], hand: [{ card: "BT4-103", as: "option" }] }, 1: { battleArea: [{ card: "BT4-045", as: "target", under: [{ card: "BT4-044", as: "source" }] }] } }, { autoSelectCards: true });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT4-045"));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });

  it("returns a level 5 stack to deck bottom while the opponent has 8 cards", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT4-023"], hand: [{ card: "BT4-103", as: "option" }] }, 1: { hand: Array.from({ length: 8 }, () => "BT1-001") as string[], battleArea: [{ card: "BT4-045", as: "target", under: [{ card: "BT4-044", as: "source" }] }], deck: ["BT1-002"] } }, { autoSelectCards: true });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT4-045");
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });

  it("activates the threshold-aware Main effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-103", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT4-045", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT4-045")).toBe(true);
  });
});
