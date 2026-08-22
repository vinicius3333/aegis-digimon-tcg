import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST9/ST9-13.js";
import "./ST10-09.js";

describe("ST10-09 Witchmon", () => {
  it("returns a purple level 5 or lower Digimon from trash on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST10-09", as: "witchmon" }], trash: [{ card: "ST10-11", as: "returned" }] } }, { autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("witchmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("returned").instanceId));
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not return a purple level 6 Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST10-09", as: "witchmon" }], trash: [{ card: "ST10-06", as: "tooLarge" }] } }, { autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("witchmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST10-09"));
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("tooLarge").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("tooLarge").instanceId)).toBe(false);
  });

  it("plays itself from security and resolves its On Play effect", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST10-09", as: "witchmon", faceUp: true }], trash: [{ card: "ST10-11", as: "returned" }] } }, { autoOrderTriggers: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("witchmon"));
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("returned").instanceId));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("returned").instanceId)).toBe(true);
  });

  it("plays after its security battle and resolves On Play during a multi-check attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST9-13", as: "attacker" }] },
        1: {
          security: ["ST10-02", { card: "ST10-09", as: "witchmon" }],
          trash: [{ card: "ST10-11", as: "returned" }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    const witchmonInstanceId = s.inst("witchmon").instanceId;
    const returnedInstanceId = s.inst("returned").instanceId;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === witchmonInstanceId) &&
        s.state.players[1]!.hand.some((c) => c.instanceId === returnedInstanceId),
      3000,
    );

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === witchmonInstanceId)).toBe(true);
    expect(s.state.players[1]!.hand.some((c) => c.instanceId === returnedInstanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
