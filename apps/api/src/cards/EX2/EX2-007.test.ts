import { describe, it, expect } from "vitest";
import { Phase, getCardDefinition } from "@aegis/shared";
import { compiled } from "./EX2-007.js";
import { validateDecklist } from "../../engine/deckValidation.js";
import { RED_DECK } from "../../engine/testDecks.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT6/BT6-095.js";
import "../BT7/BT7-067.js";
import "../BT7/BT7-107.js";
import "../BT8/BT8-018.js";
import "../ST9/ST9-10.js";
import "../BT8/BT8-071.js";
import "../index.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013"];

describe("EX2-007 (Mother D-Reaper) routing and registration", () => {
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

  it("does not place a Searcher when another Mother D-Reaper is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-007", as: "mother" },
          { card: "EX2-007", as: "otherMother" },
        ],
        hand: [{ card: "EX2-046", as: "searcher" }],
      },
    });
    await s.ready();

    expect(JSON.parse(s.inst("mother").activatableEffectsJson || "[]")).toHaveLength(0);
    const activation = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("mother").topCard.instanceId,
      effectKey: "EX2-007/ir-27-0",
    });
    expect(activation).toEqual({ ok: false, reason: "illegal-target" });
    await drainMicrotasks();

    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("searcher").instanceId)).toBe(true);
    expect(s.perm("mother").stack).toHaveLength(0);
    expect(s.perm("otherMother").stack).toHaveLength(0);
  });

  it("may place an in-play ADR-02 Searcher under Mother and trashes that Searcher's sources (Q3287)", async () => {
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

  it("counts a source added after an earlier play registered the D-Reaper reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: ["EX2-046"] }],
          hand: [
            { card: "BT1-010", as: "filler" },
            { card: "EX2-046", as: "searcher" },
            { card: "EX2-047", as: "pendulumFeet" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("filler").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010"));
    expect(s.state.memory).toBe(7);

    const searcherId = s.inst("searcher").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("mother").topCard.instanceId,
        effectKey: "EX2-007/ir-27-0",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mother").stack.some((card) => card.instanceId === searcherId));
    expect(s.perm("mother").stack).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pendulumFeet").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX2-047"));
    expect(s.state.memory).toBe(6);
  });
});

describe("EX2-007 Mother D-Reaper — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;

  function ownCardAddedToHand(s: Setup, instanceId: string): boolean {
    return s.events.some(
      (event) => event.kind === "cardsMoved" && event.to === "hand" && event.instanceIds.includes(instanceId),
    );
  }

  it("goes in the Digi-Egg deck, not the main deck (Q3273)", () => {
    const withMotherAsEgg = { mainDeck: RED_DECK.mainDeck, eggDeck: [...RED_DECK.eggDeck.slice(0, 4), "EX2-007"] };
    expect(validateDecklist(withMotherAsEgg)).toEqual({ ok: true });

    const withMotherInMain = { mainDeck: [...RED_DECK.mainDeck.slice(0, 49), "EX2-007"], eggDeck: RED_DECK.eggDeck };
    expect(validateDecklist(withMotherInMain)).toMatchObject({ ok: false });
  });

  it("hatches into the breeding area as a level-less Digimon (Q3274)", async () => {
    const s = setupEngine({ 0: { eggDeck: [{ card: "EX2-007", as: "mother" }] } });
    s.state.phase = Phase.Breeding;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding !== undefined);

    expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(s.inst("mother").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(getCardDefinition("EX2-007")?.level).toBeUndefined();
  });

  it("cannot be digivolved from, because it has no level (Q3275)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-007", as: "mother" }],
        hand: [
          { card: "EX2-047", as: "dReaper" },
          { card: "BT1-009", as: "levelThree" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    for (const alias of ["dReaper", "levelThree"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("mother").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toMatchObject({ ok: false });
    }
    expect(s.perm("mother").topCard.cardId).toBe("EX2-007");
    expect(s.perm("mother").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
  });

  it("moves from the breeding area to the battle area because it has DP, unlike a level 2 (Q3276)", async () => {
    async function moveFromBreeding(cardId: string) {
      const s = setupEngine({ 0: { breeding: { card: cardId, as: "raised" } } });
      s.state.phase = Phase.Breeding;
      await s.engine.recomputeContinuousEffects();
      const result = s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("raised").permanentId });
      await settle();
      return { s, result };
    }

    const mother = await moveFromBreeding("EX2-007");
    expect(mother.result).toEqual({ ok: true });
    expect(mother.s.state.players[0]!.breeding).toBeUndefined();
    expect(mother.s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX2-007"]);

    const levelTwo = await moveFromBreeding("BT14-001");
    expect(levelTwo.result).toMatchObject({ ok: false });
    expect(levelTwo.s.state.players[0]!.breeding?.topCard.cardId).toBe("BT14-001");
    expect(levelTwo.s.state.players[0]!.battleArea).toHaveLength(0);
  });

  describe("returning it to the hand sends it to the Digi-Egg deck bottom but still pays the return", () => {
    async function playReturning(returnedCard: string, playedCard: "BT4-031" | "BT4-102", opponentCard: string) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT4-023", as: "handWatcher", under: ["BT7-087"] },
              { card: returnedCard, as: "returned" },
            ],
            eggDeck: [{ card: "BT4-001", as: "egg" }],
            hand: [{ card: playedCard, as: "played" }],
          },
          1: { battleArea: [{ card: opponentCard, as: "opponent" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      const returnedId = s.perm("returned").topCard.instanceId;
      const opponentId = s.perm("opponent").topCard.instanceId;
      preferred.push(returnedId, opponentId);
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === opponentId));
      await settle(() => s.state.pendingDecision === undefined);
      return { s, returnedId };
    }

    for (const [qno, played, cost] of [
      ["Q1198", "BT4-031", 7],
      ["Q1265", "BT4-102", 3],
    ] as const) {
      it(`${played} returns the opponent's Digimon without a hand-added trigger for Mother (${qno})`, async () => {
        const { s, returnedId } = await playReturning("EX2-007", played, "BT4-025");
        const own = s.state.players[0]!;
        expect(own.battleArea.some((permanent) => permanent.topCard.instanceId === returnedId)).toBe(false);
        expect(own.eggDeck.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId, returnedId]);
        expect(own.eggDeck.at(-1)?.faceUp).toBe(false);
        expect(own.hand.some((card) => card.instanceId === returnedId)).toBe(false);
        expect(ownCardAddedToHand(s, returnedId)).toBe(false);
        expect(s.state.players[1]!.battleArea).toHaveLength(0);
        expect(s.state.memory).toBe(10 - cost);

        const control = await playReturning("BT4-022", played, "BT4-025");
        expect(control.s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(control.returnedId);
        expect(control.s.state.memory).toBe(10 - cost + 1);
      });
    }
  });

  describe("MarineAngemon returning it", () => {
    async function playMarineReturning(returnedCard: string) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: returnedCard, as: "returned" }],
            hand: [{ card: "BT14-030", as: "marine" }],
            eggDeck: [{ card: "BT1-001", as: "egg" }],
            deck: inertDeck,
            security: ["BT1-009"],
          },
          1: { battleArea: [{ card: "BT14-020", as: "opponentLevelThree" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm("returned").topCard.instanceId);
      s.state.memory = 12;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.topCard.cardId === "BT14-030"));
      await settle(() => s.state.pendingDecision === undefined);
      return s;
    }

    it("accepts Mother as the returned Digimon, sending it to the Digi-Egg deck without a return-to-hand trigger (Q2402)", async () => {
      const s = await playMarineReturning("EX2-007");
      const motherId = s.inst("returned").instanceId;
      expect(s.state.players[0]!.eggDeck.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId, motherId]);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === motherId)).toBe(false);
      expect(ownCardAddedToHand(s, motherId)).toBe(false);
      expect(s.state.players[0]!.security).toHaveLength(1);
    });

    it("returns no opponent Digimon, because Mother has no level to compare (Q2403)", async () => {
      const s = await playMarineReturning("EX2-007");
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT14-020"]);
      expect(s.state.players[1]!.hand).toHaveLength(0);

      const control = await playMarineReturning("BT14-020");
      expect(control.state.players[1]!.battleArea).toHaveLength(0);
      expect(control.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT14-020"]);
    });
  });

  it("pays Lunamon's return cost for 2 memory while going to the Digi-Egg deck (Q3558)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-016", as: "lunamon" },
            { card: "EX2-007", as: "mother" },
            { card: "BT14-030", as: "returnWatcher" },
          ],
          eggDeck: ["BT1-001"],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-011"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("mother").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.eggDeck.some((card) => card.cardId === "EX2-007"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.eggDeck.map((card) => card.cardId)).toEqual(["BT1-001", "EX2-007"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("EX2-007");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  describe("placing it in the security stack", () => {
    type Chosen = "mother" | "plain";

    function setupWithSecurityWatchers(
      chosen: Chosen,
      hand: { card: string; as: string }[],
      extraBattleArea: { card: string; as: string }[] = [],
    ) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX1-031", as: "securityAddedWatcher", under: ["EX1-030"] },
              { card: "BT4-097", as: "kari" },
              { card: "EX2-007", as: "mother" },
              { card: "BT1-009", as: "plain" },
              ...extraBattleArea,
            ],
            eggDeck: ["BT1-001", "BT1-002"],
            security: ["BT4-033"],
            hand,
          },
          1: {
            battleArea: [{ card: "BT1-010", as: "opponentDigimon", dp: 5000 }],
            security: [
              { card: "BT1-011", as: "opponentSecurityA" },
              { card: "BT1-012", as: "opponentSecurityB" },
            ],
            deck: ["BT1-013"],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm(chosen).permanentId, s.perm(chosen).topCard.instanceId);
      s.state.memory = 10;
      return s;
    }

    async function tacticalRetreat(chosen: Chosen) {
      const s = setupWithSecurityWatchers(chosen, [{ card: "BT4-105", as: "retreat" }]);
      const chosenPermanentId = s.perm(chosen).permanentId;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("retreat").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === chosenPermanentId) &&
          s.state.pendingDecision === undefined,
      );
      return s;
    }

    async function quantumon(chosen: Chosen) {
      const s = setupWithSecurityWatchers(
        chosen,
        [{ card: "LM-020", as: "quantumon" }],
        [{ card: "BT17-036", as: "base" }],
      );
      const chosenPermanentId = s.perm(chosen).permanentId;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("quantumon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === chosenPermanentId) &&
          s.state.pendingDecision === undefined,
      );
      await settle(() => s.state.pendingDecision === undefined);
      return s;
    }

    it("cannot put Mother in security with Tactical Retreat; it goes to the Digi-Egg deck and no security-added effect fires (Q1270)", async () => {
      const control = await tacticalRetreat("plain");
      expect(control.state.players[0]!.security[0]!.instanceId).toBe(control.inst("plain").instanceId);
      expect(control.perm("opponentDigimon").currentDP).toBe(3000);

      const s = await tacticalRetreat("mother");
      const motherId = s.inst("mother").instanceId;
      expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT4-033"]);
      expect(s.state.players[0]!.eggDeck.at(-1)?.instanceId).toBe(motherId);
      expect(s.perm("opponentDigimon").currentDP).toBe(5000);
    });

    it("fires no security-removed effect when Tactical Retreat diverts Mother (Q1272)", async () => {
      const s = await tacticalRetreat("mother");
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.perm("kari").isSuspended).toBe(false);
      expect(s.state.memory).toBe(9);
    });

    it("places Mother face down at the bottom of the Digi-Egg deck instead of on top of security (Q3284)", async () => {
      const s = await tacticalRetreat("mother");
      const eggDeck = s.state.players[0]!.eggDeck;
      expect(eggDeck.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002", "EX2-007"]);
      expect(eggDeck.at(-1)?.faceUp).toBe(false);
      expect(s.state.players[0]!.security[0]?.cardId).toBe("BT4-033");
    });

    it("pays Quantumon's placement with Mother and still moves an opponent security card to their deck top (Q4008)", async () => {
      const s = await quantumon("mother");
      const motherId = s.inst("mother").instanceId;
      const opponentSecurityIds = [s.inst("opponentSecurityA").instanceId, s.inst("opponentSecurityB").instanceId];
      expect(s.state.players[0]!.eggDeck.at(-1)?.instanceId).toBe(motherId);
      expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT4-033"]);
      expect(s.perm("opponentDigimon").currentDP).toBe(5000);
      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(opponentSecurityIds).toContain(s.state.players[1]!.deck[0]?.instanceId);
    });

    it("fires no security-removed effect when Quantumon diverts Mother (Q4010)", async () => {
      const s = await quantumon("mother");
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.perm("kari").isSuspended).toBe(false);
      expect(s.state.memory).toBe(5);
    });
  });

  it("can be moved to the battle area from breeding by Gennai, unlike a no-DP egg (Q2463)", async () => {
    async function attackIntoBreeding(breedingCard: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT14-088", as: "gennai" }],
            breeding: { card: breedingCard, as: "breeding" },
            security: ["BT1-085"],
          },
          1: { battleArea: [{ card: "BT14-015", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.security.length === 0);
      return s;
    }

    const mother = await attackIntoBreeding("EX2-007");
    expect(mother.state.players[0]!.breeding).toBeUndefined();
    expect(mother.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("EX2-007");
    expect(mother.perm("gennai").isSuspended).toBe(true);

    const kingDrasil = await attackIntoBreeding("BT13-007");
    expect(kingDrasil.state.players[0]!.breeding?.topCard.cardId).toBe("BT13-007");
    expect(kingDrasil.perm("gennai").isSuspended).toBe(false);
  });
});
