import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-108.js";

describe("BT2-108 Trump Sword", () => {
  it("plays a purple level 3 from trash without its On Play", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT2-067"], hand: [{ card: "BT2-108", as: "option" }], trash: ["BT2-067"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT2-067")).toBe(true);
  });

  it("activates its Main play-from-trash effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-108", as: "securityOption", faceUp: true }], trash: [{ card: "BT2-067", as: "revived" }] } }, { autoSelectCards: true });
    const revivedId = s.inst("revived").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId)).toBe(true);
  });
});
