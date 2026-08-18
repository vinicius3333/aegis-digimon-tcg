import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-111.js";

describe("BT4-111 Jack Raid", () => {
  it("gains exactly 1 memory for every complete 10 cards already in trash", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT4-076"], hand: [{ card: "BT4-111", as: "option" }], trash: Array.from({ length: 20 }, () => "BT4-077") } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("does not count itself as the tenth trash card", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT4-076"], hand: [{ card: "BT4-111", as: "option" }], trash: Array.from({ length: 9 }, () => "BT4-077") } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 10);
    expect(s.state.memory).toBe(0);
  });

  it("gains exactly 2 memory from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-111", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.memory).toBe(2);
  });
});
