import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-014.js";
describe("BT10-014 PileVolcamon", () => {
  it("encodes triggered Blitz and an owner-turn +2000 DP aura", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenDigivolving",
        keywords: [expect.objectContaining({ keyword: "Blitz" })],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "permanent" })],
      }),
    ]);
  });

  it("gains Blitz when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT10-014", as: "evolving" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
  });

  it("gets +2000 DP only during its owner's turn without stacking on recompute", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-014", as: "pileVolcamon" }] } });

    await s.ready();
    expect(s.perm("pileVolcamon").currentDP).toBe(13_000);

    await advance(s.engine).recompute();
    expect(s.perm("pileVolcamon").currentDP).toBe(13_000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("pileVolcamon").currentDP).toBe(11_000);
  });

  it("uses Blitz to attack after evolution passes memory to the opponent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-010", as: "base" }],
        hand: [{ card: "BT10-014", as: "evolving" }],
      },
      1: { security: ["BT10-062"] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const decision = s.state.pendingDecision!;
    expect(JSON.parse(decision.payloadJson)).toMatchObject({ promptKey: "activateBlitz" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("base").permanentId));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(-1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
