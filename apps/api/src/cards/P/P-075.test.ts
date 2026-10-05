import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-083.js";
import "../BT9/BT9-052.js";
import "../BT9/BT9-109.js";
import "../EX3/EX3-016.js";
import "../EX3/EX3-019.js";
import "./P-075.js";

describe("P-075 Okuwamon", () => {
  it("grants each current opponent Digimon one independent lose-memory watcher after evolving into Insectoid", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-075", as: "okuwamon" }],
        hand: [{ card: "BT1-083", as: "granKuwagamon" }],
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("okuwamon").permanentId,
        instanceId: s.inst("granKuwagamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("okuwamon").topCard.cardId === "BT1-083" &&
        advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSuspended", s.perm("first").permanentId).length ===
          1,
      2_000,
    );
    const memoryAfterDigivolve = s.state.memory;

    await advance(s.engine).verb.suspend([s.perm("first").permanentId]);
    await settle(() => s.state.memory === memoryAfterDigivolve + 1, 2_000);

    expect(s.state.memory).toBe(memoryAfterDigivolve + 1);
    expect(s.perm("second").isSuspended).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("second").permanentId]);
    await settle(() => s.state.memory === memoryAfterDigivolve + 2);
    expect(s.state.memory).toBe(memoryAfterDigivolve + 2);
  });

  it("grants before payment even when an inherited cost increase prevents completing the evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-075", as: "okuwamon" }],
        hand: [{ card: "BT1-083", as: "granKuwagamon" }],
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [{ card: "EX3-020", as: "costIncreaser", under: ["EX3-016", "EX3-019"] }],
      },
    });
    s.state.memory = -6;
    await s.ready();
    const handBefore = s.state.players[0]!.hand.map((card) => card.instanceId);
    const deckBefore = s.state.players[0]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("okuwamon").permanentId,
        instanceId: s.inst("granKuwagamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSuspended", s.perm("costIncreaser").permanentId)
          .length === 1,
    );
    await settle();

    expect(s.perm("okuwamon").topCard.cardId).toBe("P-075");
    expect(s.perm("okuwamon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(handBefore);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(s.state.memory).toBe(-6);
    await advance(s.engine).verb.suspend([s.perm("costIncreaser").permanentId]);
    await settle(() => s.state.memory === -5);
  });

  it.each([true, false])("grants through the real effect-digivolution primitive with payCost=%s", async (payCost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-075", as: "okuwamon" }],
        hand: [{ card: "BT1-083", as: "granKuwagamon" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 5;
    await s.ready();
    // Supplemental paid/free primitive controls; the X Antibody test below uses a printed producer.
    await advance(s.engine).verb.digivolveFromInstance(
      s.perm("okuwamon").permanentId,
      s.inst("granKuwagamon").instanceId,
      { payCost },
    );
    expect(s.perm("okuwamon").topCard.cardId).toBe("BT1-083");
    expect(
      advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSuspended", s.perm("opponent").permanentId),
    ).toHaveLength(1);
    expect(s.state.memory).toBe(payCost ? 1 : 5);
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle();
    expect(s.state.memory).toBe(payCost ? 2 : 6);
  });

  it.each([true, false])(
    "does not grant during the opponent's turn on an effect route (payCost=%s)",
    async (payCost) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "P-075", as: "okuwamon" }],
          hand: [{ card: "BT9-052", as: "result" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "opponent" }],
          deck: ["BT1-014", "BT1-015", "BT1-016"],
          security: ["BT1-017", "BT1-018"],
        },
      });
      s.state.memory = 5;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      try {
        await advance(s.engine).waitForMainPhase(0);
        advance(s.engine).endMainPhaseIfOpen(0);
        await advance(s.engine).waitForMainPhase(1);
        // Counter/effect-route control through the production primitive, with a real turn transition.
        await advance(s.engine).verb.digivolveFromInstance(
          s.perm("okuwamon").permanentId,
          s.inst("result").instanceId,
          {
            payCost,
          },
        );
        expect(s.perm("okuwamon").topCard.cardId).toBe("BT9-052");
        expect(
          advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSuspended", s.perm("opponent").permanentId),
        ).toHaveLength(0);
        expect(observe(s.engine).hasPierce(s.perm("okuwamon"))).toBe(false);
      } finally {
        if (!s.state.gameOver) s.engine.applyIntent(1, { type: "surrender" });
        await loop;
      }
    },
  );

  it("grants before the X Antibody attack evolution's own suspension resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-075", as: "okuwamon" }],
          hand: [
            { card: "BT9-109", as: "antibody" },
            { card: "BT9-052", as: "okuwamonX" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Switch attack target"] },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("antibody").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("okuwamon").stack.some((card) => card.instanceId === s.inst("antibody").instanceId));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("okuwamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("okuwamon").topCard.cardId === "BT9-052");
    await advance(s.engine).finishAttack();
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(6);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.description?.includes("lose 1 memory")),
    ).toHaveLength(1);
  });

  it("does not grant the watcher merely because Okuwamon is sitting on the field", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-075", as: "okuwamon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle();

    expect(s.state.memory).toBe(0);
  });

  it("grants one independent copy for each of two actual evolution declarations", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-075", as: "firstBase" },
          { card: "P-075", as: "secondBase" },
        ],
        hand: [
          { card: "BT1-083", as: "firstResult" },
          { card: "BT1-083", as: "secondResult" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 10;
    await s.ready();
    for (const { base, result } of [
      { base: "firstBase", result: "firstResult" },
      { base: "secondBase", result: "secondResult" },
    ]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(base).permanentId,
          instanceId: s.inst(result).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(base).topCard.cardId === "BT1-083");
      await settle();
    }
    expect(s.state.memory).toBe(2);
    expect(
      advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSuspended", s.perm("opponent").permanentId),
    ).toHaveLength(2);
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle(() => s.state.memory === 4);
  });

  it("does not extend an existing grant to a Digimon that enters later", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-075", as: "okuwamon" }],
        hand: [{ card: "BT1-083", as: "result" }],
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "existing" }],
        hand: [{ card: "BT1-009", as: "later" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("okuwamon").permanentId,
        instanceId: s.inst("result").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("okuwamon").topCard.cardId === "BT1-083");
    await advance(s.engine).verb.playInstances([s.inst("later").instanceId]);
    const later = s.state.players[1]!.battleArea.find((permanent) => permanent.topCard === s.inst("later"))!;
    expect(advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSuspended", later.permanentId)).toHaveLength(0);
    const memoryBeforeSuspending = s.state.memory;
    await advance(s.engine).verb.suspend([later.permanentId]);
    await settle();
    expect(s.state.memory).toBe(memoryBeforeSuspending);
  });

  it.each([
    { label: "a non-Insectoid result", base: "P-075", into: "BT1-080", grants: 0 },
    { label: "another Digimon evolving", base: "BT1-077", into: "BT1-083", grants: 0 },
    { label: "another copy evolving exactly once", base: "P-075", into: "BT1-083", grants: 1 },
  ])("respects the self and result filters for $label", async ({ base, into, grants }) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-075", as: "idleOkuwamon" },
          { card: base, as: "evolving" },
        ],
        hand: [{ card: into, as: "result" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("evolving").permanentId,
        instanceId: s.inst("result").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolving").topCard.cardId === into);
    await settle();
    expect(
      advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSuspended", s.perm("opponent").permanentId),
    ).toHaveLength(grants);
    const memoryBeforeSuspending = s.state.memory;
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle();
    expect(s.state.memory).toBe(memoryBeforeSuspending + grants);
  });

  it("keeps the grant through the opponent's turn and expires it at that turn's end", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-075", as: "okuwamon" }],
        hand: [{ card: "BT1-083", as: "granKuwagamon" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponent" }],
        deck: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        security: ["BT1-011", "BT1-012"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("okuwamon").permanentId,
          instanceId: s.inst("granKuwagamon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("okuwamon").topCard.cardId === "BT1-083");
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(
        advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSuspended", s.perm("opponent").permanentId),
      ).toHaveLength(1);
      const memoryBeforeSuspending = s.state.memory;
      await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
      await settle(() => s.state.memory === memoryBeforeSuspending - 1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      expect(
        advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSuspended", s.perm("opponent").permanentId),
      ).toHaveLength(0);
      await advance(s.engine).verb.unsuspend([s.perm("opponent").permanentId]);
      const memoryAfterExpiry = s.state.memory;
      await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
      await settle();
      expect(s.state.memory).toBe(memoryAfterExpiry);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("grants Piercing to an Insectoid host through its inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-083", as: "host", under: ["P-075"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });

  it("does not grant inherited Piercing to a non-Insectoid host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", as: "host", under: ["P-075"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
  });
});
