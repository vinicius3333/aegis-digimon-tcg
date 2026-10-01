import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-041.js";

describe("BT6-041 Manticoremon", () => {
  it("trashes top security to give an opposing Digimon -5000 DP when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-041", as: "mistymon" }], security: [{ card: "BT1-001", as: "security" }] },
        1: { battleArea: [{ card: "BT6-016", as: "target" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("target").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mistymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === baseDP - 5000);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(baseDP - 5000);
  });

  it("cannot pay its security-trash cost when your security stack is empty", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-041", as: "manticoremon" }], security: [] },
        1: { battleArea: [{ card: "BT6-016", as: "target", suspended: true, dp: 10000 }], security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const attackerId = s.perm("manticoremon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("manticoremon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.phase === Phase.Main && s.state.players[0]!.battleArea.length === 0 && !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([attackerId]);
  });
});

describe("BT6-041 Manticoremon — KB Q&A rulings", () => {
  it("cannot activate its -5000 DP effect when your security stack is empty (Q1427)", async () => {
    function attackWithSecurity(security: string[]) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT6-041", as: "manticoremon" }], security },
        1: { battleArea: [{ card: "BT6-016", as: "target" }], security: ["BT1-010"] },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("manticoremon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      return s;
    }

    const withSecurity = attackWithSecurity(["BT1-001"]);
    await settle(() => withSecurity.state.pendingDecision?.kind === "optional");
    const offer = withSecurity.state.pendingDecision!;
    expect(JSON.parse(offer.payloadJson)).toMatchObject({ timing: "WhenAttacking" });
    expect(
      withSecurity.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: offer.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => withSecurity.perm("target").currentDP === withSecurity.perm("target").baseDP - 5000);
    expect(withSecurity.state.players[0]!.security).toHaveLength(0);

    // No auto-accept here: an offered optional prompt would halt the attack before the security check.
    const emptySecurity = attackWithSecurity([]);
    await settle(() => emptySecurity.state.players[1]!.security.length === 0);
    await drainMicrotasks();
    expect(emptySecurity.state.pendingDecision).toBeUndefined();
    expect(emptySecurity.state.players[0]!.trash).toHaveLength(0);
    expect(emptySecurity.perm("target").currentDP).toBe(emptySecurity.perm("target").baseDP);
  });
});
