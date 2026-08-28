import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-037.js";

describe("BT18-037 Lobomon", () => {
  it("adds an exact Hybrid security card and recovers the exact deck card", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Search", searchZone: "security", zone: "security", optional: true, count: 1, to: "hand" },
        { kind: "Recover", amount: 1, condition: { kind: "bindingExists", ref: "searched" } },
        { kind: "SecurityManipulation", op: "shuffle", controller: "mine" },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Koji Minamoto"], cost: 2, isAlternate: true, baseIsTamer: true },
      { names: ["KendoGarurumon"], cost: 0, isAlternate: true },
    ]);
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-037", as: "lobomon" }],
          security: [{ card: "BT12-009", as: "hybrid", faceUp: true }, "BT1-001"],
          deck: ["BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const resolving = advance(s.engine).fireForInstance(EffectTiming.WhenDigivolving, s.perm("lobomon").topCard!);
    await settle(() => s.decisions.length > 0);
    const decision = s.decisions[0]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-002")).toBe(true);
    assertNoLoudGap(s);
  });

  it("digivolves from Koji for 2, keeps the Tamer as a source, performs the bonus draw, and resolves its own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-087", as: "koji" },
            { card: "BT16-049", as: "digimonOnlyWatcher" },
          ],
          hand: [{ card: "BT18-037", as: "lobomon" }],
          security: [
            { card: "BT12-009", as: "hybridSecurity" },
            { card: "BT1-009", as: "nonmatch" },
          ],
          deck: [
            { card: "BT1-010", as: "evolutionDraw" },
            { card: "BT1-011", as: "recoveryCard" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koji").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("koji").topCard?.instanceId === s.inst("lobomon").instanceId &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("hybridSecurity").instanceId) &&
        s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("recoveryCard").instanceId),
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("koji").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("koji").instanceId]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("evolutionDraw").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("may decline the security add and therefore does not recover under Q2960", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-037", as: "lobomon" }],
          security: [
            { card: "BT12-009", as: "hybrid" },
            { card: "BT1-009", as: "nonmatch" },
          ],
          deck: [{ card: "BT1-010", as: "recoveryCard" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.WhenDigivolving, s.perm("lobomon").topCard!);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck.some(({ instanceId }) => instanceId === s.inst("recoveryCard").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("can't attack after digivolving from a Tamer played this turn under Q2959", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-087", as: "freshKoji", enteredThisTurn: true }],
        hand: [{ card: "BT18-037", as: "lobomon" }],
        security: ["BT1-009"],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("freshKoji").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("freshKoji").topCard?.instanceId === s.inst("lobomon").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("freshKoji").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    assertNoLoudGap(s);
  });

  it.each([
    [7, true],
    [8, false],
  ])("inherits an attack draw with %i cards in hand only when the hand has 7 or fewer", async (handSize, draws) => {
    const hand = Array.from({ length: handSize }, (_, index) => ({ card: "BT1-009", as: `hand-${index}` }));
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-037"] }],
        hand,
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId)).toBe(draws);
    assertNoLoudGap(s);
  });
});
