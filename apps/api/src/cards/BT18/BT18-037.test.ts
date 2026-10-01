import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  assertNoLoudGap,
  drainMicrotasks,
  setupEngine,
  settle,
  type EngineSetup,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
          security: [{ card: "BT12-009", as: "hybrid", faceUp: true }, "BT1-009"],
          deck: ["BT1-011", "BT1-010"],
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
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-010")).toBe(true);
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
        s.state.memory === 4,
    );

    expect(s.state.memory).toBe(4);
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

describe("BT18-037 Lobomon — KB Q&A rulings", () => {
  const digivolve = (s: EngineSetup, baseAlias: string, cardAlias: string) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(baseAlias).permanentId,
      instanceId: s.inst(cardAlias).instanceId,
    });

  it("digivolves from Koji as a Tamer: Digimon digivolve watchers stay silent and a 'Digimon can't digivolve' lock does not block it (Q2957)", async () => {
    const setupWatchers = (lockDigimon: boolean) =>
      setupEngine(
        {
          0: {
            ...(lockDigimon ? { breeding: { card: "BT13-007", as: "kingDrasil" } } : {}),
            battleArea: [
              { card: "BT7-087", as: "koji" },
              { card: "BT1-029", as: "gabumon" },
              { card: "BT5-091", as: "takumi" },
              { card: "BT16-049", as: "armadillomon" },
            ],
            hand: [
              { card: "BT18-037", as: "lobomon" },
              { card: "BT18-037", as: "secondLobomon" },
            ],
            security: ["BT1-009"],
            deck: ["BT1-010", "BT1-011", "BT1-012"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

    const locked = setupWatchers(true);
    locked.state.memory = 5;
    await locked.ready();
    expect(digivolve(locked, "gabumon", "secondLobomon")).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(digivolve(locked, "koji", "lobomon")).toEqual({ ok: true });
    await settle(
      () =>
        locked.perm("koji").topCard?.instanceId === locked.inst("lobomon").instanceId &&
        locked.state.pendingDecision === undefined,
    );
    await drainMicrotasks();
    expect(locked.perm("koji").stack.map(({ instanceId }) => instanceId)).toEqual([locked.inst("koji").instanceId]);
    expect(locked.perm("takumi").isSuspended).toBe(false);
    expect(locked.state.memory).toBe(3);

    const digimonBase = setupWatchers(false);
    digimonBase.state.memory = 5;
    await digimonBase.ready();
    expect(digivolve(digimonBase, "gabumon", "lobomon")).toEqual({ ok: true });
    await settle(
      () =>
        digimonBase.perm("gabumon").topCard?.instanceId === digimonBase.inst("lobomon").instanceId &&
        digimonBase.state.pendingDecision === undefined,
    );
    await drainMicrotasks();
    expect(digimonBase.perm("takumi").isSuspended).toBe(true);
    expect(digimonBase.state.memory).toBe(3);
  });

  it("performs the digivolution bonus draw when it digivolves from the Koji Tamer (Q2958)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: [{ card: "BT18-037", as: "lobomon" }],
          security: ["BT1-009"],
          deck: [
            { card: "BT1-010", as: "bonusDraw" },
            { card: "BT1-011", as: "nextCard" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(digivolve(s, "koji", "lobomon")).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.instanceId === s.inst("lobomon").instanceId);
    await drainMicrotasks();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("nextCard").instanceId]);
  });

  it("keeps Koji as a digivolution card that is trashed with Lobomon when it leaves the field (Q6605)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: [{ card: "BT18-037", as: "lobomon" }],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-030", dp: 30000, suspended: true, as: "wall" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(digivolve(s, "koji", "lobomon")).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.instanceId === s.inst("lobomon").instanceId);
    await drainMicrotasks();
    expect(s.perm("koji").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("koji").instanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("koji").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await advance(s.engine).finishAttack();

    const trashIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trashIds).toEqual(expect.arrayContaining([s.inst("koji").instanceId, s.inst("lobomon").instanceId]));
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("koji").instanceId)).toBe(false);
  });

  it("does not gain the Security effect of the Koji Tamer in its digivolution cards (Q6606)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-037", as: "lobomon", under: [{ card: "BT7-087", as: "buriedKoji" }] }],
        },
        1: { security: [{ card: "BT7-087", as: "checkedKoji" }, "BT1-030"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lobomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await advance(s.engine).finishAttack();

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("checkedKoji").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("lobomon").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("buriedKoji").instanceId]);
  });

  it("gains the inherited effect of the Koji Tamer in its digivolution cards (Q6607)", async () => {
    const digivolveAndSearch = async (baseCard: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: baseCard, as: "base" }],
            hand: [{ card: "BT18-037", as: "lobomon" }],
            security: [{ card: "BT12-009", as: "hybrid" }, "BT1-009"],
            deck: ["BT1-010", "BT1-011"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(digivolve(s, "base", "lobomon")).toEqual({ ok: true });
      await settle(
        () =>
          s.perm("base").topCard?.instanceId === s.inst("lobomon").instanceId &&
          s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("hybrid").instanceId) &&
          s.state.pendingDecision === undefined,
      );
      await drainMicrotasks();
      return s;
    };

    const fromKoji = await digivolveAndSearch("BT7-087");
    expect(fromKoji.state.memory).toBe(4);
    expect(observe(fromKoji.engine).isRestricted(fromKoji.perm("base"), "cantBeBlocked")).toBe(true);

    const fromKendoGarurumon = await digivolveAndSearch("BT4-027");
    expect(fromKendoGarurumon.state.memory).toBe(5);
    expect(observe(fromKendoGarurumon.engine).isRestricted(fromKendoGarurumon.perm("base"), "cantBeBlocked")).toBe(
      false,
    );
  });
});
