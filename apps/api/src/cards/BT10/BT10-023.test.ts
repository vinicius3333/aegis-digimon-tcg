import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-023.js";
describe("BT10-023 Thetismon", () => {
  it("draws 2 when its controller has 6 or fewer cards in hand", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-010", as: "base" }], hand: [{ card: "BT10-023", as: "evolving" }], deck: ["BT1-001", "BT1-002"] } }); s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not draw 2 when the digivolution bonus leaves 7 cards in hand (Q1948)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-010", as: "base" }],
        hand: [
          { card: "BT10-023", as: "evolving" },
          "BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006",
        ],
        deck: ["BT1-007", "BT1-008", "BT1-009"],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-023");

    expect(s.state.players[0]!.hand).toHaveLength(7);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("trashes 2 cards to unsuspend and attack a second time only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-023", as: "thetismon" }],
        hand: Array.from({ length: 8 }, () => "BT1-001"),
      },
      1: { security: ["BT1-002", "BT1-003"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnCount += 1;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("thetismon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.length === 6 &&
      !s.perm("thetismon").isSuspended &&
      !observe(s.engine).isAttacking()
    );
    expect(s.state.players[0]!.trash).toHaveLength(2);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("thetismon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("thetismon").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
