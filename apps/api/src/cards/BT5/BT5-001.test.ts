import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-001.js";

describe("BT5-001 Koromon", () => {
  it("draws once when its Greymon host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-113", as: "host", under: ["BT5-001"] }], deck: ["BT1-009"] },
      1: { security: ["BT1-010"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not trigger for an excluded Greymon name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-064", as: "host", under: ["BT5-001"] }],
        deck: ["BT1-009"],
      },
      1: { security: ["BT1-012"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it.each([
    ["BT5-086", true],
    ["BT5-010", true],
    ["BT7-064", false],
    ["BT4-013", false],
    ["BT9-078", false],
    ["BT1-009", false],
  ])("matches the complete name boundary for %s", async (host, shouldDraw) => {
    const s = setupEngine({
      0: { battleArea: [{ card: host, as: "host", under: ["BT5-001"] }], deck: ["BT1-009"] },
      1: { security: ["BT1-012"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(shouldDraw ? 1 : 0);
  });

  it("draws only once per turn from the same inherited effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-113", as: "host", under: ["BT5-001"] }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { security: ["BT1-012", "BT1-012"] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
