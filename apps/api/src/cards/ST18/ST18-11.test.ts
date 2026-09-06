import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./ST18-11.js";

describe("ST18-11 Parrotmon", () => {
  it("suspends an opponent Digimon and prevents it from unsuspending", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST18-11", as: "parrotmon" }] }, 1: { battleArea: [{ card: "ST18-03", as: "victim" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("parrotmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim").isSuspended && observe(s.engine).isRestricted(s.perm("victim"), "unsuspend"));

    expect(s.perm("victim").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "unsuspend")).toBe(true);
  });

  it("publishes Piercing as its inherited keyword", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        isInherited: true,
        keywords: [expect.objectContaining({ keyword: "Piercing" })],
      }),
    );
  });

  it("uses inherited Piercing in battle and expires the unsuspend lock at opponent turn end", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-10", as: "host", under: ["ST18-11"] }], hand: [] },
      1: { battleArea: [{ card: "BT1-010", dp: 3000, as: "target", suspended: true }], security: ["BT1-011"] },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);

    const lock = setupEngine(
      {
        0: { hand: [{ card: "ST18-11", as: "parrotmon" }] },
        1: { battleArea: [{ card: "ST18-03", as: "victim" }], deck: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true },
    );
    lock.state.memory = 7;
    expect(lock.engine.applyIntent(0, { type: "playCard", instanceId: lock.inst("parrotmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(lock.engine).isRestricted(lock.perm("victim"), "unsuspend"));
    lock.state.turnSeat = 1;
    lock.state.memory = -lock.state.memory;
    await advance(lock.engine).runTurn(1);
    expect(observe(lock.engine).isRestricted(lock.perm("victim"), "unsuspend")).toBe(false);
  });
});
