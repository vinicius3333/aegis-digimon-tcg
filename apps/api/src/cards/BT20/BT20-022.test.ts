import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-022.js";
import "../BT1/BT1-036.js";
import "./index.js";

describe("BT20-022 Crabmon (X Antibody)", () => {
  it("protects one of your Digimon from battle deletion on entry and draws at the inherited hand boundary", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Restrict",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            restriction: "beDeletedInBattle",
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 7 },
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Crabmon"], cost: 0, isAlternate: true }]);
  });

  it("protects the selected ally from battle deletion through the opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-022", as: "crabmonX" }],
          battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "protected" }],
        },
        1: { battleArea: [{ card: "BT20-017", dp: 11000, as: "attacker" }], deck: ["BT1-010", "BT1-010"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crabmonX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "beDeletedInBattle"));
    preferred.push(s.perm("protected").permanentId);
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("protected").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length >= 1);
    expect(s.perm("protected")).toBeDefined();

    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm("protected"), "beDeletedInBattle")).toBe(false);
  });

  it("reaches Crabmon (X Antibody) from a legal Crabmon stack through public evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-019", as: "crabmon" }], hand: [{ card: "BT20-022", as: "crabmonX" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("crabmon").permanentId,
        instanceId: s.inst("crabmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("crabmon").topCard.cardId === "BT20-022");
    expect(s.perm("crabmon").topCard.cardId).toBe("BT20-022");
    expect(s.perm("crabmon").stack.map((card) => card.cardId)).toEqual(["BT15-019"]);
  });

  it("inherits Draw 1 at exactly 7 hand cards and only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-024", as: "host", under: ["BT20-022"] }],
          hand: [
            { card: "BT1-036", as: "firstGarurumon" },
            { card: "BT1-009", as: "handCost" },
            ...Array.from({ length: 5 }, () => "BT1-010"),
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT20-007"],
        },
        1: { security: Array.from({ length: 8 }, () => "BT1-010"), deck: ["BT20-008", "BT20-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length >= 1);
    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstGarurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(7);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length >= 2);
    expect(s.state.players[0]!.hand).toHaveLength(7);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("handCost").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(7);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length >= 3);
    expect(s.state.players[0]!.hand).toHaveLength(8);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    const over = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-024", as: "host", under: ["BT20-022"] }],
          hand: Array.from({ length: 8 }, () => "BT1-010"),
          deck: ["BT1-010"],
        },
        1: { security: Array.from({ length: 8 }, () => "BT1-010"), deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    over.state.memory = 10;
    await over.ready();
    expect(
      over.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: over.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => over.events.filter((event) => event.kind === "combatResolved").length >= 1);
    expect(over.state.players[0]!.hand).toHaveLength(8);
  });
});
