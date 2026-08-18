import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST1/ST1-13.js";
import "../ST3/ST3-11.js";
import "./BT1-105.js";

describe("BT1-105 Blast Fire", () => {
  it("sets an opposing Digimon's original DP to 3000", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-047"],
        hand: [{ card: "BT1-105", as: "option" }],
      },
      1: { battleArea: [{ card: "BT2-047", as: "target" }] },
    }, { autoSelectCards: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("Q974/Q975 adds later DP modifiers, survives digivolution, then expires after the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-047"],
          hand: [{ card: "BT1-105", as: "blastFire" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "ST1-09", as: "target" }],
          hand: [
            { card: "ST1-13", as: "shadowWing" },
            { card: "ST1-11", as: "warGreymon" },
          ],
          deck: ["BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const controllerTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.phase === Phase.Main);
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("blastFire").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await controllerTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 1 && s.state.phase === Phase.Main);
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, {
      type: "playCard",
      instanceId: s.inst("shadowWing").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000);

    expect(s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: s.perm("target").permanentId,
      instanceId: s.inst("warGreymon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "ST1-11");

    // The override belongs to the permanent, not the old top card. Shadow Wing's
    // +3000 therefore still adds to Blast Fire's 3000 after digivolution.
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await opponentTurn;

    expect(s.perm("target").currentDP).toBe(12_000);
  });

  it("Q973 lets a later -4000 DP effect delete the 3000-DP target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST3-11", as: "seraphimon" }],
          hand: [{ card: "BT1-105", as: "blastFire" }],
        },
        1: {
          battleArea: [{ card: "ST3-07", as: "target" }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("blastFire").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("seraphimon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(
      (permanent) => permanent.permanentId === targetId,
    ));

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "ST3-07")).toBe(true);
  });
});
