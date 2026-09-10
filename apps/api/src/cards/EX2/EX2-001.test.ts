import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-001.js";

describe("EX2-001 Gigimon", () => {
  it("draws once when its Guilmon-family host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          // A legal EX2 evolution stack: Gigimon -> Guilmon -> Growlmon -> WarGrowlmon -> Gallantmon.
          battleArea: [{ card: "EX2-011", as: "host", under: ["EX2-001", "EX2-008", "EX2-009", "EX2-010"] }],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "BT1-010", as: "notDrawn" },
          ],
        },
        1: { security: ["BT1-011", "BT1-012"] },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });

  it("does not draw when its host name is outside the Guilmon family", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-015", as: "host", under: ["EX2-001"] }],
          deck: [{ card: "BT1-009", as: "notDrawn" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });

  it.each([
    ["Guilmon", "EX2-008", ["EX2-001"]],
    ["Growlmon", "EX2-009", ["EX2-001", "EX2-008"]],
    ["Gallantmon", "EX2-011", ["EX2-001", "EX2-008", "EX2-009", "EX2-010"]],
  ] as Array<[string, string, string[]]>)("matches the printed %s name alternative", async (_name, host, under) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: host, as: "host", under }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(under);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("fires after the card reaches the battle area through a real Digi-Egg evolution route", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "EX2-001", as: "egg" }],
          hand: [{ card: "EX2-008", as: "guilmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
          security: ["BT1-011"],
        },
        // Keep an actionable neutral permanent so the production loop exposes seat 1's Main
        // phase to waitForMainPhase before that turn is ended.
        1: {
          battleArea: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-010"],
        },
      },
      { autoOrderTriggers: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX2-001");
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("guilmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX2-008");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: eggPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
