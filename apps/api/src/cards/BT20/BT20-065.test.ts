import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
// Self-register every card module so the engine drives the REGISTERED BT20-065 IR.
import "./index.js";
import { compiled } from "./BT20-065.js";

/**
 * A3 — Q1f: BT20-065 (Purple Digimon) "[On Play] By trashing 1 card in your hand, give 1 of
 * your opponent's Digimon '[On Deletion] Lose 1 memory.' until the end of their turn."
 *
 * This card exercises the shared "[On Deletion] Lose 1 memory." library entry and the generic
 * cost-paying wrapper (`action.cost`/`optional`/`abortOnDecline`): the grant must depend on the
 * trash cost actually being payable.
 *
 * FAILS-WHEN-REVERTED: reverting the interpreter's routing branch or the library entry makes
 * the grant either throw when the recipient is deleted, or silently install nothing.
 */

describe("A3 BT20-065 — granted '[On Deletion] Lose 1 memory.' (costed)", () => {
  it("publishes the printed stats and both zero-cost evolution routes", () => {
    expect(getCardDefinition("BT20-065")).toMatchObject({
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Purple", level: 2, memoryCost: 0 },
        { color: "Red", level: 2, memoryCost: 0 },
      ],
    });
  });

  it("retains inherited Retaliation", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation" }],
    });
  });

  it("evolves publicly from a legal level-2 Purple source at zero cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-006", as: "demimeramon" }],
        hand: [{ card: "BT20-065", as: "wormmon" }],
      },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("demimeramon").permanentId,
        instanceId: s.inst("wormmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("demimeramon").topCard.cardId === "BT20-065");
    expect(s.perm("demimeramon").stack.map((card) => card.cardId)).toEqual(["BT20-006"]);
    expect(s.state.memory).toBe(0);
  });

  it("POSITIVE: paying the trash cost grants the effect; deleting the recipient costs 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-069", dp: 5000, as: "attacker" }],
          hand: [
            { card: "BT20-065", as: "wormmon" },
            { card: "BT1-085", as: "fodder" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, suspended: true, as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const wormmon = s.inst("wormmon");
    const recipient = s.perm("recipient");

    s.state.memory = 5;
    s.state.turnSeat = 0;

    const playRes = s.engine.applyIntent(0, { type: "playCard", instanceId: wormmon.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("fodder").instanceId));

    s.state.memory = 5; // isolate the granted effect's delta from the play/cost's own changes

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: recipient.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === recipient.permanentId) && s.state.memory === 6);

    expect(s.state.memory).toBe(6); // 5 + 1
  });

  it("NEGATIVE (cost): no card in hand to trash => no grant => deletion costs nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-069", dp: 5000, as: "attacker" }],
          hand: [{ card: "BT20-065", as: "wormmon" }],
        }, // nothing left to trash after playing it
        1: { battleArea: [{ card: "BT1-009", dp: 3000, suspended: true, as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const wormmon = s.inst("wormmon");
    const recipient = s.perm("recipient");

    s.state.memory = 5;
    s.state.turnSeat = 0;

    const playRes = s.engine.applyIntent(0, { type: "playCard", instanceId: wormmon.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-065"));

    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: recipient.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === recipient.permanentId) && s.state.memory === 5);

    expect(s.state.memory).toBe(5);
  });

  it("grants Retaliation only as an inherited stack keyword", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-066", under: ["BT20-065"], as: "host" },
          { card: "BT20-065", as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Retaliation")).toBe(false);
  });

  it("expires the opponent deletion-loss grant after the real opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-010", dp: 5000, as: "attacker" }],
          hand: [
            { card: "BT20-065", as: "wormmon" },
            { card: "BT1-085", as: "fodder" },
          ],
          deck: ["BT20-001", "BT20-002"],
          security: ["BT20-001", "BT20-002"],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000, suspended: true, as: "recipient" }],
          deck: ["BT20-001", "BT20-002"],
          hand: ["BT20-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("fodder").instanceId));

    s.state.turnSeat = 1;
    s.state.memory = 5;
    const recipientId = s.perm("recipient").permanentId;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: recipientId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 5;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: recipientId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === recipientId));
    expect(s.state.memory).toBe(5);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});
