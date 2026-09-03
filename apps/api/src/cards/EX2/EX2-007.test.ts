import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./EX2-007.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../ST9/ST9-10.js";

// EX2-007 (Mother D-Reaper) — KB-grounded behavior tests.
//
// Three clauses:
//   1. Registration + timing routing: [Main] must route to OnDeclaration;
//      [All Turns] static restrictions route to None.
//   2. [Your Turn] cost-reduction effect — the IR's Replacement action carries a
//      condition of kind:"raw" which evaluates to false (evaluateCondition line 571).
//      The hand-written module replaces that inert path with a live cost modifier.
//      KB basis: printed text "[Your Turn][Once Per Turn] When you would play a
//      card with [D-Reaper] in its traits from your hand, you may reduce its play
//      cost by 1 for each of this Digimon's digivolution cards." and documented behavior source

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "EX2-007",
    set: "EX2",
    nameEn: "Mother D-Reaper",
    kinds: ["DigiEgg"] as never,
    colors: ["White"] as never,
    playCost: 0,
    dp: 1000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(opts: { stackSize?: number; isOnBattle?: boolean; isOwnersTurn?: boolean } = {}): CardSource {
  const stackSize = opts.stackSize ?? 3;
  const stack = Array.from({ length: stackSize }, (_, i) => ({
    instanceId: `STACK#${i}`,
    cardId: `STACK-CARD-${i}`,
    ownerSeat: 0 as Seat,
  }));

  const permanent: Permanent = {
    permanentId: "PERM#EX2-007",
    topCard: { instanceId: "INST#EX2-007", cardId: "EX2-007", ownerSeat: 0 as Seat },
    stack,
    currentDP: 1000,
    isSuspended: false,
    linked: [],
  } as unknown as Permanent;

  return {
    instanceId: "INST#EX2-007",
    cardId: "EX2-007",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => permanent,
    isOnBattleArea: () => opts.isOnBattle ?? true,
    isOwnersTurn: () => opts.isOwnersTurn ?? true,
    hasColor: () => false,
  };
}

describe("EX2-007 (Mother D-Reaper) routing and registration", () => {
  const module = getEffectModule("EX2-007");

  it("is registered", () => {
    expect(module, "EX2-007 must be registered on import").toBeDefined();
  });

  it("[Main] routes to OnDeclaration (activated permanent ability window)", () => {
    // The Main trigger maps to both OnUseOption and OnDeclaration in timingsForTrigger.
    // OnDeclaration is how activateEffect reaches a permanent's activated [Main].
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnDeclaration, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("[All Turns] static restriction routes to None and OnPlay contributes nothing", () => {
    // AllTurns and YourTurn triggers both map to EffectTiming.None (staticModifier).
    // The card has no [On Play] clause.
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });
});

describe("EX2-007 Mother D-Reaper — integrated D-Reaper line", () => {
  it("cannot attack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-007", as: "mother" }] }, 1: { security: ["BT1-001"] } });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mother").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("is not affected by an opponent's On Play effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-007", as: "mother" }], deck: ["BT1-001"] },
        1: { hand: [{ card: "ST9-10", as: "snimon" }], deck: ["BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("snimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST9-10"));
    expect(s.perm("mother").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("reduces only the first D-Reaper play each turn by its source count", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: ["EX2-046"] }],
          hand: [
            { card: "EX2-047", as: "firstDReaper" },
            { card: "EX2-047", as: "secondDReaper" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstDReaper").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-047"));
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondDReaper").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "EX2-047").length === 2,
    );
    expect(s.state.memory).toBe(0);
  });

  it("places ADR-02 Searcher from hand as its bottom source through the public Main-effect intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: ["EX2-046"] }],
          hand: [{ card: "EX2-046", as: "searcher" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const searcherId = s.inst("searcher").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("mother").topCard.instanceId,
        effectKey: "EX2-007/ir-27-0",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mother").stack.some((card) => card.instanceId === searcherId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(searcherId);
    expect(s.perm("mother").stack[0]?.instanceId).toBe(searcherId);
  });

  it("allows the Main effect only once per turn even with another Searcher in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother" }],
          hand: [
            { card: "EX2-046", as: "firstSearcher" },
            { card: "EX2-046", as: "secondSearcher" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const motherInstanceId = s.perm("mother").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: motherInstanceId,
        effectKey: "EX2-007/ir-27-0",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mother").stack.length === 1);
    await settle(() => s.events.some((event) => event.kind === "effectActivated" && event.sourceCardId === "EX2-007"));

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: motherInstanceId,
        effectKey: "EX2-007/ir-27-0",
      }).ok,
    ).toBe(false);
    expect(s.perm("mother").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("may place an in-play ADR-02 Searcher under Mother and trashes that Searcher's sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother" },
            { card: "EX2-046", as: "fieldSearcher", under: ["EX2-001", "EX2-002"] },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const searcherId = s.perm("fieldSearcher").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("mother").topCard.instanceId,
        effectKey: "EX2-007/ir-27-0",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mother").stack.some((card) => card.instanceId === searcherId));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("mother").stack[0]?.instanceId).toBe(searcherId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX2-001", "EX2-002"]),
    );
  });
});
