import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-048.js";
import "../index.js";

describe("BT25-048 Bearmon", () => {
  it("reduces a battle-area TS digivolution by 1 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-048", as: "source" }], hand: [{ card: "BT25-050", as: "target" }] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-050");

    expect(s.state.memory).toBe(1);
  });

  it("does not reduce a non-TS or breeding-area digivolution", async () => {
    const nonTs = setupEngine({
      0: { battleArea: [{ card: "BT25-048", as: "source" }], hand: [{ card: "BT25-049", as: "target" }] },
    });
    nonTs.state.memory = 2;
    await nonTs.ready();
    expect(
      nonTs.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nonTs.perm("source").permanentId,
        instanceId: nonTs.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => nonTs.perm("source").topCard?.cardId === "BT25-049");
    expect(nonTs.state.memory).toBe(0);

    const breeding = setupEngine({
      0: { breeding: { card: "BT25-048", as: "source" }, hand: [{ card: "BT25-050", as: "target" }] },
    });
    breeding.state.memory = 2;
    await breeding.ready();
    expect(
      breeding.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breeding.perm("source").permanentId,
        instanceId: breeding.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => breeding.state.players[0]!.breeding?.topCard?.cardId === "BT25-050");
    expect(breeding.state.memory).toBe(0);

    const nonGreenTs = setupEngine({
      0: { battleArea: [{ card: "BT25-048", as: "source" }], hand: [{ card: "BT25-013", as: "target" }] },
    });
    nonGreenTs.state.memory = 3;
    await nonGreenTs.ready();
    expect(
      nonGreenTs.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nonGreenTs.perm("source").permanentId,
        instanceId: nonGreenTs.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => nonGreenTs.perm("source").topCard?.cardId === "BT25-013");
    expect(nonGreenTs.state.memory).toBe(1);
  });

  it("rejects the Bearmon controller's digivolution intent during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-048", as: "source" }], hand: [{ card: "BT25-050", as: "target" }] },
    });
    s.state.memory = 2;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: false, reason: "not-your-turn" });
    expect(s.state.memory).toBe(2);
    expect(s.perm("source").topCard?.cardId).toBe("BT25-048");
  });

  it("reduces a cost-2 green TS evolution to exactly one at the zero-memory boundary", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-048", as: "source" }], hand: [{ card: "BT25-050", as: "target" }] },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-050");

    expect(s.state.memory).toBe(0);
  });

  it("draws once when the inherited Bearmon wins a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-050", as: "winner", under: ["BT25-048"] }], hand: [], deck: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-009", as: "loser", suspended: true }] },
    });
    await s.ready();
    const winnerId = s.perm("winner").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: s.perm("loser").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand[0]!.cardId).toBe("BT1-001");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === winnerId)).toBe(true);
  });

  it("draws naturally when the inherited Bearmon wins a security battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-050", as: "winner", under: ["BT25-048"], dp: 12000 }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { security: [{ card: "BT1-009", as: "security" }] },
    });
    s.state.memory = 2;
    const winnerId = s.perm("winner").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === winnerId)).toBe(true);
  });

  it("does not draw when the inherited Bearmon loses its battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-050", as: "winner", under: ["BT25-048"], dp: 1000 }], deck: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-009", as: "loser", suspended: true, dp: 5000 }] },
    });
    await s.ready();
    const winnerId = s.perm("winner").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: winnerId,
        target: { kind: "permanent", permanentId: s.perm("loser").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === winnerId)).toBe(false);
  });

  it("draws when Bearmon wins against a Digimon whose battle deletion is prevented", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-050", as: "winner", under: ["BT25-048"], dp: 12000 }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT10-074", as: "purge", under: ["BT10-073"], suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const winnerId = s.perm("winner").permanentId;
    const purgeId = s.perm("purge").permanentId;
    const purgeSourceId = s.inst("purge").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: winnerId,
        target: { kind: "permanent", permanentId: purgeId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === winnerId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === purgeId)).toBe(true);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toContain(purgeSourceId);
    const armorPurgeCost = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(purgeSourceId),
    );
    const battleWin = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT25-048",
    );
    expect(armorPurgeCost).toBeGreaterThanOrEqual(0);
    expect(battleWin).toBeGreaterThan(armorPurgeCost);
  });

  it("keeps the losing Digimon's deletion effect alongside the turn-player win trigger", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-050", as: "winner", under: ["BT25-048"], dp: 12000 }], deck: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-035", as: "loser", under: ["BT1-030"], suspended: true, dp: 5000 }] },
    });
    s.state.memory = 2;
    await s.ready();
    const loserId = s.perm("loser").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: loserId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === loserId)).toBe(false);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT1-035")).toBe(true);
    const battleWin = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT25-048",
    );
    const loserOnDeletion = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT1-030",
    );
    expect(battleWin).toBeGreaterThanOrEqual(0);
    expect(loserOnDeletion).toBeGreaterThan(battleWin);
  });

  it("records the alternate evolution requirement and inherited timing", () => {
    expect(digivolutionRequirementsFor("BT25-048")).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });
  });

  it("pays both printed evolution routes and rejects an off-color non-TS egg", async () => {
    const ordinary = setupEngine({
      0: { breeding: { card: "ST23-01", as: "greenEgg" }, hand: [{ card: "BT25-048", as: "bearmon" }] },
    });
    await ordinary.ready();
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("greenEgg").permanentId,
        instanceId: ordinary.inst("bearmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => ordinary.perm("greenEgg").topCard.cardId === "BT25-048");
    expect(ordinary.state.memory).toBe(0);

    const alternate = setupEngine({
      0: { breeding: { card: "BT24-002", as: "tsEgg" }, hand: [{ card: "BT25-048", as: "bearmon" }] },
    });
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("tsEgg").permanentId,
        instanceId: alternate.inst("bearmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("tsEgg").topCard.cardId === "BT25-048");
    expect(alternate.state.memory).toBe(0);

    for (const useAlternate of [false, true]) {
      const invalid = setupEngine({
        0: { breeding: { card: "BT1-001", as: "redEgg" }, hand: [{ card: "BT25-048", as: "bearmon" }] },
      });
      await invalid.ready();
      expect(
        invalid.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: invalid.perm("redEgg").permanentId,
          instanceId: invalid.inst("bearmon").instanceId,
          ...(useAlternate ? { alternateRequirementIndex: 0 } : {}),
        }),
      ).toMatchObject({ ok: false });
      expect(invalid.perm("redEgg").topCard.cardId).toBe("BT1-001");
      expect(invalid.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT25-048");
    }
  });

  it("suppresses the inherited draw on a second same-turn battle win", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-050", as: "winner", under: ["BT25-048"], dp: 12000 }],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true, dp: 3000 },
            { card: "BT1-013", as: "second", suspended: true, dp: 3000 },
            { card: "BT1-014", as: "third", suspended: true, dp: 8000 },
          ],
          deck: ["BT1-005", "BT1-006"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const winnerId = s.perm("winner").permanentId;
    const attack = async (target: string) => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: winnerId,
          target: { kind: "permanent", permanentId: target },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    };
    await attack(s.perm("first").permanentId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    await advance(s.engine).verb.unsuspend([winnerId]);
    await attack(s.perm("second").permanentId);
    expect(s.state.players[0]!.hand).toHaveLength(1);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("third").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("third").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("winner").isSuspended).toBe(false);
    await attack(s.perm("third").permanentId);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});
