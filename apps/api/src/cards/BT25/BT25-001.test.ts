import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-001 Tokomon", () => {
  it("matches the catalog identity and TS traits", () => {
    expect(getCardDefinition("BT25-001")).toMatchObject({
      cardId: "BT25-001",
      nameEn: "Tokomon",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      forms: ["In-Training"],
      types: ["Lesser", "Iliad", "TS"],
    });
  });

  it("draws only once per turn when its TS evolution host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-008", as: "host", under: ["BT25-001"] }],
          hand: [{ card: "BT25-012", as: "champion" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("champion").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT25-012");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT25-001", "BT25-008"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // The public evolution draws one card; the inherited attack trigger draws one more.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-003"]);
  });

  it("does not draw when its evolution host lacks the TS trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT25-001"] }],
        deck: ["BT1-001"],
      },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("resets its inherited Once Per Turn draw on the controller's next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-008", as: "host", under: ["BT25-001"] }],
        deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
      },
      1: { deck: ["BT1-004", "BT1-005", "BT1-006"], security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.deck).toHaveLength(4);

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.deck).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
