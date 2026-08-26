import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-003 Frimon", () => {
  it("trashes the top security and digivolves into a Glowing Dawn card for 1 less", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-032", as: "host", under: ["BT25-003"] }],
          hand: [
            { card: "BT25-035", as: "glowingDawn" },
            { card: "BT1-010", as: "nearMatch" },
          ],
          security: [
            { card: "BT1-001", as: "topSecurity" },
            { card: "BT1-002", as: "bottomSecurity" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("glowingDawn").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT25-035" && !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("bottomSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("topSecurity").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT25-003", "BT25-032"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nearMatch").instanceId);
  });

  it("keeps security, memory, and the hand unchanged when the optional digivolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-032", as: "host", under: ["BT25-003"] }],
          hand: [{ card: "BT25-035", as: "glowingDawn" }],
          security: [
            { card: "BT1-001", as: "topSecurity" },
            { card: "BT1-002", as: "bottomSecurity" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").topCard?.cardId).toBe("BT25-032");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("topSecurity").instanceId,
      s.inst("bottomSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("glowingDawn").instanceId);
  });
});
