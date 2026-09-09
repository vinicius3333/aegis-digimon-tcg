import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-003.js";
import "../index.js";

describe("EX5-003 Nyaromon", () => {
  it("matches the catalog and encodes the inherited all-turns DP aura", () => {
    expect(getCardDefinition("EX5-003")).toMatchObject({
      cardId: "EX5-003",
      nameEn: "Nyaromon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      dp: 0,
      inheritedEffectText: "[All Turns] While this Digimon is suspended, it gets +1000 DP.",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "selfIsSuspended" },
        },
      ],
    });
  });

  it("applies on both players' turns and withdraws/reapplies through public attack and turn flow", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX5-003"], dp: 20_000 },
          { card: "BT1-009", as: "peer", suspended: true },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponentHost", under: ["EX5-003"], suspended: true }],
        deck: ["BT1-009", "BT1-009"],
        security: ["BT1-009", "BT1-009"],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(20_000);
    expect(s.perm("peer").currentDP).toBe(3000);
    expect(s.perm("opponentHost").currentDP).toBe(4000);

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.perm("host").currentDP === 21_000);
    expect(s.perm("host").currentDP).toBe(21_000);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    // runOneTurn is deliberately a one-turn test seam and does not pass the turn;
    // hand off the turn seat between real production loops, then let ActivePhase
    // perform the authoritative unsuspend for the owning player.
    s.state.turnSeat = 1;
    await s.engine.runOneTurn();
    expect(s.perm("opponentHost").isSuspended).toBe(false);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => !s.perm("host").isSuspended && s.perm("host").currentDP === 20_000);
    expect(s.perm("host").currentDP).toBe(20_000);
    expect(s.perm("opponentHost").currentDP).toBe(3000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.perm("host").currentDP === 21_000);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").currentDP).toBe(21_000);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("keeps the inherited aura through a legal evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-003"] }],
          hand: [{ card: "BT1-014", as: "evolution" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "targetOne", suspended: true },
            { card: "BT1-009", as: "targetTwo", suspended: true },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-014", 500);

    expect(s.perm("host").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-003", "BT1-009"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.perm("host").currentDP).toBe(4000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("targetOne").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.perm("host").currentDP === 5000);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    await s.engine.runOneTurn();
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => !s.perm("host").isSuspended && s.perm("host").currentDP === 4000);
    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});
