import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-035.js";
import "../index.js";

describe("BT21-035 compiled implementation", () => {
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

  it("preserves Armor Purge and grants +2000 DP until the opponent's turn ends", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }],
      }),
    );
    const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions).toEqual([
      {
        kind: "ModifyDP",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        amount: 2000,
        duration: "untilOpponentTurnEnd",
      },
    ]);
  });

  it("unsuspends itself once per turn when its attack target changes", () => {
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(yourTurn?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenAttackTargetSwitched",
        sourceFilter: { isSelfRef: true },
        actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
      },
    ]);
  });

  it("preserves the Veemon alternate Digivolution cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Veemon"], cost: 2, isAlternate: true }]);
  });

  it("stacks Veemon's reduction and inherited DP with its own evolution bonus", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-032", as: "veemon", under: ["BT21-002"] }],
        hand: [{ card: "BT21-035", as: "flamedramon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("flamedramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.cardId === "BT21-035");

    expect(s.state.memory).toBe(2);
    expect(s.perm("veemon").currentDP).toBe(10000);
    expect(s.perm("veemon").stack.map((card) => card.cardId)).toEqual(["BT21-002", "BT21-032"]);
    expect(observe(s.engine).hasKeyword(s.perm("veemon"), "Armor Purge")).toBe(true);
  });

  it("unsuspends only for its own changed attack target and only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-035", as: "flamedramon", suspended: true },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });
    expect(s.perm("flamedramon").isSuspended).toBe(true);

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("flamedramon").permanentId,
    });
    expect(s.perm("flamedramon").isSuspended).toBe(false);

    s.perm("flamedramon").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("flamedramon").permanentId,
    });
    expect(s.perm("flamedramon").isSuspended).toBe(true);
  });

  it("does not unsuspend from the target-switch trigger during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-035", as: "flamedramon", suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("flamedramon").permanentId,
    });

    expect(s.perm("flamedramon").isSuspended).toBe(true);
  });

  it("applies its DP modifier only on the When Digivolving timing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-035", as: "flamedramon" }] } });
    await s.ready();
    expect(s.perm("flamedramon").currentDP).toBe(6000);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("flamedramon"));

    expect(s.perm("flamedramon").currentDP).toBe(8000);
  });

  it("expires the When Digivolving bonus after the opponent's production turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-035", as: "flame" }], deck: ["BT1-001"] },
      1: { deck: ["BT1-002"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("flame"));
    expect(s.perm("flame").currentDP).toBe(8000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("flame").currentDP).toBe(8000);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    expect(s.perm("flame").currentDP).toBe(6000);
  });

  it("naturally unsuspends after Raid switches its public attack target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-035", as: "flame" }],
          hand: [{ card: "BT21-075", as: "skull" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "blocker", dp: 5000 }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("flame"), "Raid"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("flame").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("flame").isSuspended).toBe(false);
  });
});
