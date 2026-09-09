import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-015.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-015", () => {
  it("has Training and inherits once-per-turn trashing 1 digivolution card from an opposing Digimon when attacking", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "TrashDigivolution",
          amount: 1,
          fromTop: false,
          target: {
            count: 1,
            filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
          },
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]);
  });

  it.each([
    { base: "EX9-003", legal: true },
    { base: "EX9-008", legal: false },
  ])("checks alternate zero-cost evolution from $base", async ({ base, legal }) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "EX9-015", as: "evo" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }).ok,
    ).toBe(legal);
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard.cardId).toBe(legal ? "EX9-015" : base);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(legal ? [base] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? [] : ["EX9-015"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses Training to place the deck top face-down at the bottom of its stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-015", as: "source", under: ["EX9-002"] }], deck: ["BT1-009", "BT1-010"] },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const source = s.perm("source");
    const entry = observe(s.engine)
      .activatableEffects(source)
      .find(({ instanceId }) => instanceId === source.topCard.instanceId);
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.topCard.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => source.stack.length === 2 && s.state.players[0]!.deck.length === 1);

    expect(source.isSuspended).toBe(true);
    expect(source.stack.map((card) => card.cardId)).toEqual(["BT1-009", "EX9-002"]);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not offer Training while suspended or when the deck is empty", async () => {
    const suspended = setupEngine({
      0: { battleArea: [{ card: "EX9-015", as: "source", suspended: true, under: ["EX9-002"] }], deck: ["BT1-009"] },
    });
    await suspended.ready();
    expect(
      observe(suspended.engine)
        .activatableEffects(suspended.perm("source"))
        .some(({ instanceId }) => instanceId === suspended.perm("source").topCard.instanceId),
    ).toBe(false);

    const empty = setupEngine({ 0: { battleArea: [{ card: "EX9-015", as: "source", under: ["EX9-002"] }] } });
    await empty.ready();
    expect(
      observe(empty.engine)
        .activatableEffects(empty.perm("source"))
        .some(({ instanceId }) => instanceId === empty.perm("source").topCard.instanceId),
    ).toBe(false);
  });

  it("trashes only the bottom source and cannot repeat the effect on a second attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-037", as: "source", under: ["EX9-015"] }] },
        1: {
          battleArea: [
            { card: "ST1-10", as: "target", under: ["BT1-009", "BT1-015", "BT1-024"] },
            { card: "BT1-010", as: "noStack" },
          ],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const source = s.perm("source");
    const target = s.perm("target");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(target.stack.map(({ cardId }) => cardId)).toEqual(["BT1-015", "BT1-024"]);
    expect(target.topCard.cardId).toBe("ST1-10");
    expect(s.perm("noStack").stack).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    await advance(s.engine).verb.unsuspend([source.permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(target.stack.map(({ cardId }) => cardId)).toEqual(["BT1-015", "BT1-024"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === source.permanentId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resets the inherited once-per-turn trash effect on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-037", as: "source", under: ["EX9-015"] }],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "ST1-10", as: "target", under: ["BT1-009", "BT1-015", "BT1-024"] }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const source = s.perm("source");
    const target = s.perm("target");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(target.stack.map(({ cardId }) => cardId)).toEqual(["BT1-015", "BT1-024"]);

    await advance(s.engine).verb.unsuspend([source.permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(target.stack.map(({ cardId }) => cardId)).toEqual(["BT1-015", "BT1-024"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(source.isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(target.stack.map(({ cardId }) => cardId)).toEqual(["BT1-024"]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
