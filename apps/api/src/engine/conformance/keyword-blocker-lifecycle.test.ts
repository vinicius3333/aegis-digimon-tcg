import { describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("Blocker through public block windows", () => {
  it("publicly plays BT19-064, blocks on the opponent turn, then expires it", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-064", as: "justi" }], deck: ["BT1-009", "BT1-009"], security: ["BT1-085"] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }], deck: ["BT1-009", "BT1-009"], security: ["BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("justi").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("justi").topCard.cardId === "BT19-064");
      expect(observe(s.engine).hasKeyword(s.perm("justi"), "Blocker")).toBe(true);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
      expect(
        s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("justi").permanentId }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "combatResolved"));
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      expect(observe(s.engine).hasKeyword(s.perm("justi"), "Blocker")).toBe(false);
    } finally {
      if (s.state.phase === "Main" && s.state.pendingDecision === undefined)
        s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await Promise.race([loop, new Promise<void>((resolve) => setTimeout(resolve, 100))]);
    }
    assertNoLoudGap(s);
  });

  it.each([
    ["BT1-009", false],
    ["AD1-005", true],
  ] as const)("rejects %s from a public block window", async (card, suspended) => {
    cite("comprehensive-0151", "12-1-4: a suspended Digimon cannot block");
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-038", as: "attacker" }], security: ["BT1-085"] },
      1: {
        battleArea: [
          { card, as: "blocker", suspended },
          { card: "ST18-07", as: "eligible" },
        ],
        security: ["BT1-085"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toMatchObject({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("eligible").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
  });

  it("accepts an untapped printed AD1-005 block and resolves against that exact blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-038", as: "attacker" }], security: ["BT1-085"] },
      1: { battleArea: [{ card: "AD1-005", as: "blocker" }], security: ["BT1-085"] },
    });
    await s.ready();
    const blockerId = s.perm("blocker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === blockerId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
