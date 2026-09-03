import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT18-037.js";

describe("BT18-037 Lobomon", () => {
  it("adds an exact Hybrid security card and recovers the exact deck card", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Search", searchZone: "security", optional: true, count: 1, to: "hand" },
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
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: [{ card: "BT18-037", as: "lobomon" }],
          security: [{ card: "BT12-009", as: "hybrid", faceUp: true }, "BT1-001"],
          // Digivolution draws the first card; Recovery should take the next.
          deck: ["BT1-003", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

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
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId) &&
        s.state.memory === 4,
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(s.state.memory).toBe(4);
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
        s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("recoveryCard").instanceId) &&
        s.state.memory === 5,
    );

    expect(s.state.memory).toBe(5);
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
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: [{ card: "BT18-037", as: "lobomon" }],
          security: [
            { card: "BT12-009", as: "hybrid" },
            { card: "BT1-009", as: "nonmatch" },
          ],
          deck: [{ card: "BT1-010", as: "recoveryCard" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koji").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.instanceId === s.inst("lobomon").instanceId);

    // Declining the optional add does not suppress the normal evolution draw.
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("recoveryCard").instanceId)).toBe(
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
