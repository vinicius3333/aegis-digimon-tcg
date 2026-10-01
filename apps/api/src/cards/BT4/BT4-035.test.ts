import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-035.js";

describe("BT4-035 MirageGaogamon", () => {
  it("gains 1 memory per four cards in the opponent's hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "BT4-035", as: "evolving" }] },
      1: { hand: Array(8).fill("BT1-010") },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("does not gain memory when the opponent has only 3 cards in hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "BT4-035", as: "evolving" }] },
      1: { hand: Array(3).fill("BT1-010") },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-035", 5000);

    expect(s.state.memory).toBe(0);
  });

  it("is unblockable during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-035", as: "mirage" }] } });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("mirage"), "cantBeBlocked")).toBe(true);
  });
});

describe("BT4-035 MirageGaogamon — KB Q&A rulings", () => {
  async function digivolveAgainstHandOf(opponentHandSize: number) {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "BT4-035", as: "evolving" }] },
      1: { hand: Array(opponentHandSize).fill("BT1-010") },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-035", 5000);
    await settle();
    return s.state.memory;
  }

  it("gains no memory when the opponent has 3 or fewer cards in hand (Q1202)", async () => {
    expect(await digivolveAgainstHandOf(3)).toBe(1);
    expect(await digivolveAgainstHandOf(4)).toBe(2);
  });

  it("cannot be blocked by the opponent's Digimon with <Blocker> (Q1203)", async () => {
    async function attackIntoBlocker(attackerCardId: string) {
      const s = setupEngine({
        0: { battleArea: [{ card: attackerCardId, as: "attacker" }] },
        1: { battleArea: [{ card: "ST18-07", as: "blocker" }], security: ["AD1-001"] },
      });
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.events.some((event) => event.kind === "blockWindowOpened") || s.state.players[1]!.security.length === 0,
        5000,
      );
      return s;
    }

    const mirage = await attackIntoBlocker("BT4-035");
    expect(mirage.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(
      mirage.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: mirage.perm("blocker").permanentId }),
    ).toEqual({
      ok: false,
      reason: "wrong-phase",
    });
    expect(mirage.perm("blocker").isSuspended).toBe(false);
    expect(mirage.state.players[1]!.security).toHaveLength(0);

    const blockable = await attackIntoBlocker("AD1-001");
    expect(blockable.events.some((event) => event.kind === "blockWindowOpened")).toBe(true);
  });

  it("can still attack the opponent's suspended Digimon (Q1204)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-035", as: "mirage" }] },
      1: {
        battleArea: [
          { card: "BT4-026", as: "suspendedTarget", suspended: true },
          { card: "ST18-07", as: "activeBlocker" },
        ],
        security: ["AD1-001"],
      },
    });
    await s.ready();
    const suspendedTargetId = s.perm("suspendedTarget").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mirage").permanentId,
        target: { kind: "permanent", permanentId: s.perm("activeBlocker").permanentId },
      }),
    ).toMatchObject({ ok: false });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mirage").permanentId,
        target: { kind: "permanent", permanentId: s.perm("suspendedTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === suspendedTargetId), 5000);

    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.perm("activeBlocker").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["ST18-07"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
