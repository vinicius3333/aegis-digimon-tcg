import { Zone, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-037.js";
import "../index.js";

describe("BT21-037 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves Piercing and Armor Purge", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] }),
    );
  });

  it("suspends one opposing Digimon and grants itself +2000 DP until the opponent's turn ends", () => {
    const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions).toEqual([
      {
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      },
      {
        kind: "ModifyDP",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        amount: 2000,
        duration: "untilOpponentTurnEnd",
      },
    ]);
  });

  it("preserves the Veemon alternate Digivolution cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Veemon"], cost: 2, isAlternate: true }]);
  });

  it("evolves from Veemon for 2 reduced to 1 and retains the realistic stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-032", as: "veemon", under: ["BT21-002"] }],
        hand: [{ card: "BT21-037", as: "lighdramon" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("lighdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.cardId === "BT21-037");

    expect(s.state.memory).toBe(1);
    expect(s.perm("veemon").stack.map((card) => card.cardId)).toEqual(["BT21-002", "BT21-032"]);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("veemon").currentDP).toBe(10000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("veemon").currentDP).toBe(8000);
    s.give(1, Zone.Deck, "BT1-001");
    await advance(s.engine).runTurn(1);
    expect(s.perm("veemon").currentDP).toBe(6000);
    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(s.perm("veemon").currentDP).toBe(8000);
  });

  it("uses Piercing in a public battle to delete a Digimon and check security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-037", as: "lighdramon", enteredThisTurn: false }],
          security: ["BT1-001"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "defender", dp: 3000, suspended: true }],
          security: ["BT1-002"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lighdramon").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-037")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("defender").instanceId)).toBe(true);
  });

  it("uses Armor Purge in a public battle and leaves its Veemon source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-032", as: "source" }], hand: [{ card: "BT21-037", as: "lighdramon" }] },
        1: { battleArea: [{ card: "BT10-055", as: "stronger", suspended: true }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("lighdramon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT21-037");
    const attackerId = s.perm("source").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("stronger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId && p.topCard.cardId === "BT21-032"),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-037")).toBe(true);
  });

  it("suspends exactly one opponent and gives itself +2000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-037", as: "lighdramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen" },
            { card: "BT1-010", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lighdramon"));

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(s.perm("lighdramon").currentDP).toBe(8000);
  });

  it("gains its DP even with no suspension target and exposes both keywords", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-037", as: "lighdramon" }] } });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lighdramon"));

    expect(s.perm("lighdramon").currentDP).toBe(8000);
    expect(observe(s.engine).hasPierce(s.perm("lighdramon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("lighdramon"), "Armor Purge")).toBe(true);
  });

  it("publicly applies DP with no suspension target and expires it after the opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST8-04", as: "veemon", under: ["BT12-002"] }],
        hand: [{ card: "BT21-037", as: "lighdramon" }],
      },
      1: { deck: ["BT1-001", "BT1-002"] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("lighdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.cardId === "BT21-037");
    expect(s.perm("veemon").currentDP).toBe(8000);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("veemon").currentDP).toBe(8000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(s.perm("veemon").currentDP).toBe(6000);
  });
});
