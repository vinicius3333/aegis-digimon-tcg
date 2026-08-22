import { describe, expect, it } from "vitest";
import { EffectDuration, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-009.js";

describe("BT5-009 Shoutmon", () => {
  it("adds a Shoutmon and a Digimon with Blitz from the revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-009", as: "source" }], deck: [
      { card: "BT5-014", as: "shoutmon" }, { card: "BT5-017", as: "blitz" },
      "BT5-008", "BT5-011", "BT5-012",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("shoutmon").instanceId, s.inst("blitz").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(3);
  });

  it("its inherited effect gives a Blitz host +2000 DP on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-014", as: "host", under: ["BT5-009"] }] } });
    advance(s.engine).ledgers.continuous.addKeywordGrant(s.perm("host").permanentId, "Blitz", EffectDuration.Permanent);
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("can add two ShoutmonDX copies because each also has Blitz", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-009", as: "source" }], deck: [
      { card: "BT5-019", as: "first" }, { card: "BT5-019", as: "second" }, "BT5-008", "BT5-011", "BT5-012",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.filter((card) => card.cardId === "BT5-019").length === 2);
    expect(player.hand.filter((card) => card.cardId === "BT5-019")).toHaveLength(2);
  });
});
