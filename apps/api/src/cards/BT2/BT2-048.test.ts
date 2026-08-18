import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-048.js";

describe("BT2-048 Cherrymon", () => {
  it("has Blocker and may redirect an opponent's player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-044", dp: 6000, as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT2-048", as: "cherrymon" }],
        security: ["BT1-010"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("cherrymon"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("cherrymon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.perm("cherrymon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("may decline to block and let the player attack continue", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-044", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT2-048", as: "cherrymon" }],
        security: ["BT1-010"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("cherrymon").isSuspended).toBe(false);
  });

  it("cannot block while already suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-044", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT2-048", suspended: true, as: "cherrymon" }],
        security: ["BT1-010"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
  });
});
