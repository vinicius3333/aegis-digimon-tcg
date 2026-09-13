import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("Security Attack through public security checks", () => {
  it("publicly grants BT26-017 Security Attack +1 and reveals two cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-012", as: "ally" }],
          hand: [{ card: "BT26-017", as: "zanbamon" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          security: [
            { card: "BT1-009", as: "positiveSecurity1" },
            { card: "BT1-009", as: "positiveSecurity2" },
            { card: "BT1-009", as: "positiveSecurity3" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zanbamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    const positiveSecurityIds = [
      s.inst("positiveSecurity1").instanceId,
      s.inst("positiveSecurity2").instanceId,
      s.inst("positiveSecurity3").instanceId,
    ];
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(positiveSecurityIds.slice(0, 2));
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([positiveSecurityIds[2]]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    try {
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
    } finally {
      if (s.state.phase === "Main" && s.state.pendingDecision === undefined)
        s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await Promise.race([loop, new Promise<void>((resolve) => setTimeout(resolve, 100))]);
    }
  });

  it("publicly applies BT19-035 Security Attack -1, then expires it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-035", as: "watcher" }],
          hand: [{ card: "BT10-008", as: "xros" }],
          deck: Array(10).fill("BT1-009"),
          security: [
            { card: "BT1-009", as: "negativeSecurity1" },
            { card: "BT1-009", as: "negativeSecurity2" },
            { card: "BT1-009", as: "negativeSecurity3" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "target" }],
          deck: Array(10).fill("BT1-009"),
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("xros").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1);
      expect(s.perm("target").currentDP).toBe(9000);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("target").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "attackDeclared"));
      expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
      const negativeSecurityIds = [
        s.inst("negativeSecurity1").instanceId,
        s.inst("negativeSecurity2").instanceId,
        s.inst("negativeSecurity3").instanceId,
      ];
      expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual(negativeSecurityIds);
      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("target").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([negativeSecurityIds[0]]);
      expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual(negativeSecurityIds.slice(1));
    } finally {
      if (s.state.phase === "Main" && s.state.pendingDecision === undefined)
        s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await Promise.race([loop, new Promise<void>((resolve) => setTimeout(resolve, 100))]);
    }
  });
});
