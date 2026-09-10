import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { compiled } from "./EX2-007.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT6/BT6-095.js";
import "../BT7/BT7-067.js";
import "../BT7/BT7-107.js";
import "../BT8/BT8-018.js";
import "../ST9/ST9-10.js";
import "../BT8/BT8-071.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013"];

// EX2-007 (Mother D-Reaper) — KB-grounded behavior tests.
//
// Three clauses:
//   1. Registration + timing routing: [Main] must route to OnDeclaration;
//      [All Turns] static restrictions route to None.
//   2. [Your Turn] cost-reduction effect — the compiled Replacement action scopes the
//      played card to the [D-Reaper] trait and scales from this card's stack.
//      KB basis: printed text "[Your Turn][Once Per Turn] When you would play a
//      card with [D-Reaper] in its traits from your hand, you may reduce its play
//      cost by 1 for each of this Digimon's digivolution cards.".

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

  it("compiles all three printed clauses without a handwritten registration", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "Restrict", restriction: "attack" }),
        expect.objectContaining({ kind: "GrantImmunity", immuneFrom: "opponentEffects" }),
      ]),
    );
    expect(compiled.effects[1]).toMatchObject({ trigger: "Main", frequency: "OncePerTurn" });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          sourceFilter: { nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }] },
          scaling: { unit: "digivolutionCards", per: 1 },
        },
      ],
    });
  });

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
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-007", as: "mother" }] }, 1: { security: ["BT1-009"] } });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mother").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("can be attacked while unsuspended and deleted in battle (Q3278/Q3279/Q3285)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-018", as: "attacker", dp: 20000 }], deck: inertDeck, security: inertSecurity },
      1: { battleArea: [{ card: "EX2-007", as: "mother" }], deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.perm("mother").isSuspended).toBe(false);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("attacker"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("mother").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("owner deletion trashes Mother, because the Digi-Egg redirect covers private areas only (Q3280/Q3281)", async () => {
    const preferred: string[] = [];
    let motherId: string | undefined;
    const movementEvents: Array<{ from: string; to: string }> = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother" },
            { card: "BT7-067", as: "purpleSource" },
          ],
          hand: [{ card: "BT7-107", as: "option" }],
          deck: inertDeck,
          eggDeck: [{ card: "BT1-001", as: "egg" }],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      {
        autoSelectCards: false,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
        onEvent(event) {
          if (event.kind !== "cardsMoved" || motherId === undefined || !event.instanceIds.includes(motherId)) return;
          movementEvents.push({ from: event.from, to: event.to });
        },
      },
    );
    preferred.push(s.perm("mother").permanentId);
    motherId = s.inst("mother").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetDecision = s.state.pendingDecision;
    expect(targetDecision?.kind).toBe("chooseTargets");
    const targetPayload = JSON.parse(targetDecision!.payloadJson) as { candidateInstanceIds?: string[] };
    expect(targetPayload.candidateInstanceIds).toContain(s.perm("mother").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("mother").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === motherId) &&
        movementEvents.length > 0,
    );
    const locations = {
      hand: s.state.players[0]!.hand.some((card) => card.instanceId === motherId),
      deck: s.state.players[0]!.deck.some((card) => card.instanceId === motherId),
      eggDeck: s.state.players[0]!.eggDeck.some((card) => card.instanceId === motherId),
      trash: s.state.players[0]!.trash.some((card) => card.instanceId === motherId),
    };
    // Q3281 redirects Mother only when she would be moved to the hand, deck, or security
    // stack; CR §3-1-3-9 limits that redirect to private areas, so a deletion still trashes
    // her (the trash holds Digi-Egg cards, as the trash-targeting rulings confirm).
    expect(movementEvents.at(-1)).toEqual({ from: "battleArea", to: "trash" });
    expect(locations).toEqual({ hand: false, deck: false, eggDeck: false, trash: true });
  });

  it("may decline the first D-Reaper reduction and use it for the second play (Q3282)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: ["EX2-046"] }],
          hand: [
            { card: "EX2-047", as: "firstDReaper" },
            { card: "EX2-047", as: "secondDReaper" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstDReaper").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const firstReduction = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstReduction.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("firstDReaper").instanceId,
        ),
    );
    expect(s.state.memory).toBe(3);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondDReaper").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const secondReduction = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondReduction.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("secondDReaper").instanceId,
        ),
    );
    expect(s.state.memory).toBe(1);
  });

  it("does not let an opponent-wide deletion cancel other targets through Mother immunity (Q3285/Q3286)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [{ card: "BT6-095", as: "option" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "EX2-007", as: "mother", dp: 15000 },
            { card: "BT1-009", as: "otherTarget", dp: 15000 },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("mother").instanceId);
    expect(s.perm("mother").currentDP).toBe(15000);
  });

  it("is not affected by an opponent's On Play effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-007", as: "mother" }], deck: ["BT1-010"] },
        1: { hand: [{ card: "ST9-10", as: "snimon" }], deck: ["BT1-011", "BT1-012"] },
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

  it("cannot activate the Main placement effect from the breeding area (Q3277)", async () => {
    const s = setupEngine({ 0: { breeding: "EX2-007", hand: [{ card: "EX2-046", as: "searcher" }] } });
    await s.ready();
    const sourceInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId,
        effectKey: "EX2-007/ir-27-0",
      }),
    ).toMatchObject({ ok: false });
  });

  it("does not reduce a D-Reaper play when Psychemon prevents cost reductions (Q3283)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: ["EX2-046"] }],
          hand: [{ card: "EX2-047", as: "pendulumFeet" }],
        },
        1: { battleArea: ["BT8-071"] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pendulumFeet").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX2-047"));
    expect(s.state.memory).toBe(0);
  });
});
