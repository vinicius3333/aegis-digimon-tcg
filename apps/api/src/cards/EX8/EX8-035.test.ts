import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../BT10/BT10-023.js";
import "./index.js";
import { compiled } from "./EX8-035.js";

describe("EX8-035", () => {
  it("has a security effect that gives two opposing Digimon Security Attack -1 and returns itself to hand", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, target: { count: 2 } },
      { kind: "AddToHandSelf" },
    ]));
  it("disables opposing Digimon When Digivolving effects while you have at least 1 memory", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      condition: { kind: "memoryAtLeast", value: 1 },
      actions: [{ kind: "DisableTimingEffect", timings: ["whenDigivolving"], target: { count: "all" } }],
    }));

  it("disables an opposing Digimon's When Digivolving timing at one memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-035", as: "marine" }] },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    });
    s.state.memory = 1;
    await advance(s.engine).recompute();
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("opponent"), "whenDigivolving"));
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "whenDigivolving")).toBe(true);
    s.state.memory = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "whenDigivolving")).toBe(false);
  });

  it("suppresses a real opposing When Digivolving draw while its owner has memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-035", as: "marine" }] },
      1: {
        battleArea: [{ card: "BT1-027", as: "base" }],
        hand: [{ card: "BT16-020", as: "evolver" }],
        deck: ["BT1-028", "BT1-010", "BT1-011"],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = -5;
    await s.ready();
    const deckBefore = s.state.players[1]!.deck.length;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT16-020");
    await settle(() => s.state.players[1]!.deck.length <= deckBefore - 1);

    expect(s.perm("base").topCard.cardId).toBe("BT16-020");
    expect(s.state.players[1]!.deck.length).toBe(deckBefore - 1);
  });

  it("uses the source owner's memory side when the opponent is the turn player (Q3915)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-035", as: "marine" }] },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = -1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "whenDigivolving")).toBe(true);
  });

  it("resolves its end-of-battle Security effect after a real security battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 10000 },
            { card: "EX8-040", as: "two" },
          ],
        },
        1: {
          security: [{ card: "EX8-035", as: "marine" }],
        },
      },
      { autoSelectCards: true },
    );
    const instanceId = s.inst("marine").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === instanceId));

    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("two"), "SecurityAttack")).toBe(-1);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("two"), "SecurityAttack")).toBe(0);
  });

  it("blocks When Digivolving activation and by-cost processing but allows When Attacking (Q3917-Q3920)", async () => {
    const digivolve = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-035", as: "marine" },
            { card: "AD1-001", as: "target" },
          ],
        },
        1: {
          battleArea: [{ card: "EX8-008", as: "base" }],
          hand: [{ card: "EX8-059", as: "evolver" }, "BT1-001"],
          deck: ["BT1-028", "BT1-037"],
        },
      },
      { autoSelectCards: true },
    );
    digivolve.state.turnSeat = 1;
    digivolve.state.memory = -2;
    await digivolve.ready();
    expect(
      digivolve.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: digivolve.perm("base").permanentId,
        instanceId: digivolve.inst("evolver").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => digivolve.perm("base").topCard.cardId === "EX8-059");
    await settle(() => digivolve.state.pendingDecision === undefined);
    expect(digivolve.state.pendingDecision).toBeUndefined();
    expect(digivolve.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-028"]);

    const attack = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-035", as: "marine" }] },
        1: {
          battleArea: [{ card: "BT10-023", as: "attacker", suspended: true }],
          hand: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT1-028", "BT1-037", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    attack.state.turnSeat = 1;
    attack.state.memory = -1;
    await attack.ready();
    const handBeforeAttacking = attack.state.players[1]!.hand.length;
    expect(handBeforeAttacking).toBe(8);
    await advance(attack.engine).fire(EffectTiming.OnUseAttack, attack.perm("attacker"));
    await settle(() => attack.state.players[1]!.hand.length === handBeforeAttacking - 2);
    expect(attack.state.players[1]!.hand).toHaveLength(handBeforeAttacking - 2);
    expect(attack.perm("attacker").isSuspended).toBe(false);
  });
});
