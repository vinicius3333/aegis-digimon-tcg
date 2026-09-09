import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-022.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("EX9-022", () => {
  it("has the printed Training keyword, inherited security reduction, and alternate evolution route", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifySecurityDP",
      controller: "opponent",
      amount: -3000,
      duration: "permanent",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]);
  });

  it.each([
    { base: "EX9-001", alternate: true, legal: true },
    { base: "EX9-003", alternate: false, legal: true },
    { base: "BT1-010", alternate: true, legal: false },
  ])("checks the evolution route from $base", async ({ base, alternate, legal }) => {
    const s = setupEngine(
      base !== "BT1-010"
        ? { 0: { breeding: { card: base, as: "base" }, hand: [{ card: "EX9-022", as: "evo" }], deck: ["BT1-009"] } }
        : { 0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "EX9-022", as: "evo" }] } },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: alternate,
      }).ok,
    ).toBe(legal);
    await settle();

    expect(s.perm("base").topCard.cardId).toBe(legal ? "EX9-022" : base);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(legal ? [base] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-009"] : ["EX9-022"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces opposing Security Digimon DP without affecting an opposing battle-area Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", under: ["EX9-022"], as: "host" }] },
        1: { battleArea: [{ card: "BT1-010", as: "battle" }], security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const battle = s.perm("battle");

    await s.ready();

    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(battle.currentDP).toBe(battle.baseDP);
  });

  it.each([0 as const, 1 as const])(
    "applies the inherited reduction only during its owner's turn (turn seat %s)",
    async (turnSeat) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT1-010", under: ["EX9-022"], as: "host" }] },
        1: { security: ["BT1-009"] },
      });
      s.state.turnSeat = turnSeat;
      await s.ready();

      expect(observe(s.engine).securityDp(1)).toBe(turnSeat === 0 ? -3000 : 0);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("changes a real security battle while the inherited effect is active", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", under: ["EX9-022"], as: "attacker" }] },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("activates Training publicly and places the unrevealed deck card at stack bottom", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-022", as: "source", under: ["BT1-012"] }], deck: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    const source = s.perm("source");
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(source) as Array<{ effectKey: string; instanceId: string }>;
    expect(effect?.instanceId).toBe(source.topCard.instanceId);
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: effect!.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(source.isSuspended).toBe(true);
    expect(source.stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-012"]);
    expect(source.stack[0]?.faceUp).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it.each([
    { label: "while suspended", suspended: true, deck: ["BT1-009"] },
    { label: "with an empty deck", suspended: false, deck: [] },
  ])("does not offer Training $label", async ({ suspended, deck }) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-022", as: "source", under: ["BT1-012"], suspended }], deck },
    });
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      observe(s.engine)
        .activatableEffects(s.perm("source"))
        .some(({ instanceId }) => instanceId === s.perm("source").topCard.instanceId),
    ).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
