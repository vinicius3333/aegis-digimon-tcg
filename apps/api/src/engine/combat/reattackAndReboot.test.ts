import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { advance } from "../testkit/advance.js";
import "../../cards/index.js";

describe("attack eligibility after unsuspending", () => {
  it("Discord 1555876325355421716: an untapped effect attacker can later digivolve and declare Blitz", async () => {
    const opts = { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] as string[] };
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT20-102", "BT20-060", { card: "BT1-020", as: "base" }],
          hand: [
            { card: "ST12-12", as: "blanc" },
            { card: "BT10-014", as: "pile" },
            { card: "BT1-010", as: "cost" },
          ],
          deck: [{ card: "BT1-010", as: "draw" }, "BT1-010", "BT1-010", "BT1-010"],
        },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"], deck: ["BT1-010"] },
      },
      opts,
    );
    opts.preferInstanceIds.push(s.inst("base").instanceId, s.inst("cost").instanceId);
    // Pay Blanc's hand-trash cost with the neutral card so PileVolcamon stays in hand.
    s.state.memory = 1;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blanc").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.events.some((event) => event.kind === "attackEnded"));
      await advance(s.engine).waitForMainPhase(0);
      expect(s.perm("base").isSuspended).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("pile").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.perm("base").topCard.cardId === "BT10-014" &&
          s.perm("base").canAttackPlayer &&
          s.state.pendingDecision === undefined,
      );
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("base").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((event) => event.kind === "attackEnded").length === 2);
      expect(s.perm("base").isSuspended).toBe(true);
      expect(s.state.players[1]!.security).toHaveLength(1);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
  it("EX4-019 MachGaogamon may attack again after its When Attacking effect unsuspends it", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-035", under: ["EX4-019"], as: "machgaoga" }] },
      1: {
        hand: Array.from({ length: 8 }, () => "BT1-001"),
        security: ["BT1-101", "BT1-101", "BT1-101"],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machgaoga").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("machgaoga").isSuspended &&
        s.state.players[1]!.security.length === 2 &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX4-019") &&
        !observe(s.engine).isAttacking(),
    );
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("machgaoga"))).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machgaoga").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});

describe("Reboot timing", () => {
  it("a Digimon with printed Reboot remains suspended after attacking on its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-068", as: "rebooter" }] },
      1: { security: ["BT1-101", "BT1-101"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rebooter").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rebooter").isSuspended);

    expect(s.perm("rebooter").isSuspended).toBe(true);
  });

  it("a Digimon with inherited Reboot remains suspended after attacking on its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["BT2-055"], as: "inherited-rebooter" }] },
      1: { security: ["BT1-101", "BT1-101"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("inherited-rebooter").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("inherited-rebooter").isSuspended);

    expect(s.perm("inherited-rebooter").isSuspended).toBe(true);
  });
});
