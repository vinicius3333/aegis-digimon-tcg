import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import "../index.js";
import { compiled } from "./EX13-007.js";

const cardId = "EX13-007";

describe("EX13-007 Guilmon", () => {
  it("matches the catalog printed text, stats and evolution cost", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Guilmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Reptile"],
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      effectText:
        "[When Moving] [On Play] By trashing 1 card in your hand, you may return 1 Digimon card with [Gallantmon] in its name or 1 red Tamer card from your trash to the hand.",
      inheritedEffectText: "[All Turns] Add 2000 to this Digimon's DP deletion effects' maximums.",
    });
  });

  it("compiles both printed clauses", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    // The same clause is printed under two timings, so both must carry the same action.
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.isInherited).toBeUndefined();
      expect(effect.actions[0]).toMatchObject({
        kind: "Return",
        to: "hand",
        optional: true,
        abortOnDecline: true,
        target: { count: 1, filter: { zone: "trash", controller: "mine", kind: ["Digimon"] } },
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
      });
      // "with [Gallantmon] in its name" is the substring reading, so ChaosGallantmon is in
      // range; the red Tamer alternative is a separate kind and therefore an orFilter.
      const filter = irNode(effect.actions[0]).target.filter;
      expect(filter.nameOrTrait).toEqual([{ tokens: ["Gallantmon"], match: "name" }]);
      expect(filter.orFilters).toEqual([{ zone: "trash", controller: "mine", kind: ["Tamer"], colors: ["Red"] }]);
    }
    // No "while ..." clause is printed, so the inherited modifier carries no condition.
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "DeletionMaxDpModifier", amount: 2000, scope: "self", duration: "permanent" }],
    });
    expect(irNode(inherited.actions[0]).condition).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [On Play] By trashing 1 card in your hand, you may return 1 Digimon card with
  // [Gallantmon] in its name or 1 red Tamer card from your trash to the hand.
  // ---------------------------------------------------------------------------

  it("trashes 1 hand card to return a Gallantmon Digimon from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "fodder" },
          ],
          trash: [{ card: "BT2-020", as: "gallantmon" }],
          deck: [{ card: "BT1-010", as: "undrawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === "BT2-020"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("gallantmon").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fodder").instanceId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("undrawn").instanceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("takes the red Tamer branch of the same clause", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "fodder" },
          ],
          trash: [{ card: "BT12-089", as: "takato" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === "BT12-089"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("takato").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fodder").instanceId]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("accepts a substring name match on a Digimon of any color (ChaosGallantmon)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "fodder" },
          ],
          trash: [{ card: "BT5-081", as: "chaosGallantmon" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === "BT5-081"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("chaosGallantmon").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("discriminates the filter: no non-Gallantmon Digimon, no non-red Tamer, no opponent trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "fodder" },
          ],
          // A red Digimon without the name, a Tamer of the wrong color: both branches miss.
          trash: [
            { card: "BT1-009", as: "plainRedDigimon" },
            { card: "BT1-086", as: "blueTamer" },
          ],
          deck: ["BT1-010"],
        },
        1: { trash: [{ card: "BT2-020", as: "theirGallantmon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await drainMicrotasks(20);

    // Nothing is returned and the trash cost is never paid: the hand keeps its fodder.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("fodder").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("plainRedDigimon").instanceId,
      s.inst("blueTamer").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("theirGallantmon").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("keeps the hand card when the optional clause is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "fodder" },
          ],
          trash: [{ card: "BT2-020", as: "gallantmon" }],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await drainMicrotasks(20);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("fodder").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("gallantmon").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [When Moving] — the same clause on the public breeding-move route.
  // ---------------------------------------------------------------------------

  it("fires the same clause when it moves out of breeding", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: cardId, as: "source" },
          hand: [{ card: "BT1-009", as: "fodder" }],
          trash: [{ card: "BT12-089", as: "takato" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-010"], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("source").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === "BT12-089"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("takato").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fodder").instanceId]);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] Add 2000 to this Digimon's DP deletion effects' maximums.
  // Comprehensive rules 15-15-4-1: the bonus adds to the value SHOWN IN TEXT, so only a
  // printed numeric maximum moves. The deletion under test is BT19-015 Gallantmon's
  // [When Digivolving] "delete 1 of your opponent's Digimon with 8000 DP or less",
  // reached through the public digivolve intent with Guilmon in the stack beneath it.
  // ---------------------------------------------------------------------------

  it("raises the printed 8000 maximum to 10000 regardless of the memory gauge", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "base", under: [cardId] }],
          hand: [{ card: "BT19-015", as: "host" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    // The Gallantmon route costs 4; unlike BT19-007's conditional twin, this clause has no
    // memory gate, so the gauge is deliberately left positive when the effect resolves.
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 20);

    // Gallantmon's own [Your Turn] [Once Per Turn] "gain 2 memory" confirms a real deletion.
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-015");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([cardId, "BT19-012"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the printed 8000 maximum alone without Guilmon in the digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "base", under: ["BT1-009"] }],
          hand: [{ card: "BT19-015", as: "host" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks(20);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-009"]);
  });

  it("moves the maximum by exactly 2000: 10000 DP is deleted, 11000 DP is not", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "base", under: [cardId] }],
          hand: [{ card: "BT19-015", as: "host" }],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "inRange", dp: 10_000 },
            { card: "BT1-010", as: "outOfRange", dp: 11_000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1, 20);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
