import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-074.js";

const CARD_ID = "BT25-074";

describe("BT25-074 Tankdramon", () => {
  it("alternate-digivolves from an off-color level 4 D-Brigade/ACCEL card for exactly 3", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 4,
      traits: ["D-Brigade", "ACCEL"],
      cost: 3,
      isAlternate: true,
    });

    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT20-039", as: "offColorAccel" }],
        hand: [{ card: CARD_ID, as: "tank" }],
        deck: ["BT1-001"],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("offColorAccel").permanentId,
        instanceId: legal.inst("tank").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("offColorAccel").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-037", as: "plainBlueLv4" }], hand: [{ card: CARD_ID, as: "tank" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainBlueLv4").permanentId,
        instanceId: invalid.inst("tank").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(3);
  });

  it("reveals exactly 3, plays one matching cost-12-or-less Digimon at cost minus 5, and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-039", as: "base" }],
          hand: [{ card: CARD_ID, as: "tank" }],
          deck: [
            { card: "BT1-001", as: "evolutionDraw" },
            { card: "BT14-060", as: "candidate" },
            { card: "BT1-002", as: "plain" },
            { card: "BT14-098", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tank").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("candidate").instanceId,
        ) && s.state.players[0]!.trash.length === 2,
    );

    // BT14-060 costs 4, so the printed reduction of 5 floors its paid cost at 0.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("plain").instanceId, s.inst("option").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);

    // The When Digivolving and When Attacking headers share one physical OPT budget.
    const deckBeforeAttack = s.state.players[0]!.deck.map((card) => card.instanceId);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("base"), {
      attackerPermanentId: s.perm("base").permanentId,
    });
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBeforeAttack);
  });

  it("Q6369 triggers when Tankdramon itself is played and locks exactly one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "tank" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tank").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasRestriction(s.perm("target").permanentId, "digivolve"));
    expect(observe(s.engine).hasRestriction(s.perm("target").permanentId, "digivolve")).toBe(true);
  });

  it("grants inherited Reboot and Blocker only on the opponent turn and only to a qualifying host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-043", as: "accelHost", under: [CARD_ID] },
          { card: "BT4-090", as: "chaosmonHost", under: [CARD_ID] },
          { card: "BT1-013", as: "plainHost", under: [CARD_ID] },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("accelHost"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("accelHost"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chaosmonHost"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chaosmonHost"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Blocker")).toBe(false);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("accelHost"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("accelHost"), "Blocker")).toBe(false);
  });
});
