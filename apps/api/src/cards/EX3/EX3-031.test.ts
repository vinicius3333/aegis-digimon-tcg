import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-031.js";

function candidates(payloadJson: string): string[] {
  return (JSON.parse(payloadJson) as { candidateInstanceIds?: string[] }).candidateInstanceIds ?? [];
}

function respond(s: EngineSetup, response: DecisionResponse): void {
  const decision = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(decision.seat, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

describe("EX3-031 Veedramon", () => {
  it("has the official errata identity and digivolves from a yellow level 3 for 2", async () => {
    expect(getCardDefinition("EX3-031")).toMatchObject({
      cardId: "EX3-031",
      nameEn: "Veedramon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Mythical Dragon"],
      rarity: "U",
      imageId: "EX3-031-Errata",
    });

    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-027", as: "base" }],
        hand: [{ card: "EX3-031", as: "veedramon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-031");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("Dramon/Four Great Dragons family: overlapping cards fill only one mandatory search slot", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-027", as: "base" }],
          hand: [{ card: "EX3-031", as: "veedramon" }],
          deck: [
            { card: "BT1-028", as: "digivolutionBonusDraw" },
            { card: "EX3-036", as: "overlapMagnadramon" },
            { card: "EX3-031", as: "yellowDramon" },
            { card: "EX3-025", as: "blueFourGreatDragon" },
            { card: "BT3-024", as: "invalidBlueDramon" },
          ],
        },
      },
      { autoOrderCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const dramonChoice = s.state.pendingDecision!;
    const revealed = [
      s.inst("overlapMagnadramon").instanceId,
      s.inst("yellowDramon").instanceId,
      s.inst("blueFourGreatDragon").instanceId,
      s.inst("invalidBlueDramon").instanceId,
    ];
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-031",
      options: {
        timing: "WhenDigivolving",
        effectText: expect.stringContaining("Reveal the top 4 cards"),
        visibleInstanceIds: expect.arrayContaining(revealed),
        visibleCards: expect.arrayContaining(revealed.map((instanceId) => expect.objectContaining({ instanceId }))),
        min: 1,
        max: 1,
      },
    });
    expect(candidates(dramonChoice.payloadJson)).toContain(s.inst("overlapMagnadramon").instanceId);
    expect(candidates(dramonChoice.payloadJson)).toContain(s.inst("yellowDramon").instanceId);
    expect(candidates(dramonChoice.payloadJson)).not.toContain(s.inst("invalidBlueDramon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dramonChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(dramonChoice.decisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dramonChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("overlapMagnadramon").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const dragonChoice = s.state.pendingDecision!;
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-031",
      options: {
        timing: "WhenDigivolving",
        effectText: expect.stringContaining("[Four Great Dragons]"),
        visibleInstanceIds: expect.arrayContaining(revealed),
        min: 1,
        max: 1,
      },
    });
    expect(candidates(dragonChoice.payloadJson)).toEqual([s.inst("blueFourGreatDragon").instanceId]);
    expect(candidates(dragonChoice.payloadJson)).not.toContain(s.inst("overlapMagnadramon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dragonChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(dragonChoice.decisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dragonChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("blueFourGreatDragon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 3 && s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-036", "EX3-025", "BT1-028"]),
    );
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-031", "BT3-024"]),
    );
  });

  it("Q3408 adds the sole yellow Dramon even when no Four Great Dragon is revealed", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-027", as: "base" }],
          hand: [{ card: "EX3-031", as: "veedramon" }],
          deck: [
            { card: "BT1-028", as: "digivolutionBonusDraw" },
            { card: "EX3-031", as: "yellowDramon" },
            "BT1-029",
            "BT1-030",
            "BT1-031",
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("yellowDramon").instanceId);
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("yellowDramon").instanceId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("yellowDramon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("digivolutionBonusDraw").instanceId,
    );
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("Q3408 adds the sole Four Great Dragon even when no yellow Dramon is revealed", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-027", as: "base" }],
          hand: [{ card: "EX3-031", as: "veedramon" }],
          deck: [
            { card: "BT1-028", as: "digivolutionBonusDraw" },
            { card: "EX3-025", as: "onlyDragon" },
            "BT1-029",
            "BT1-030",
            "BT1-031",
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("onlyDragon").instanceId);
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("onlyDragon").instanceId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("digivolutionBonusDraw").instanceId, s.inst("onlyDragon").instanceId]),
    );
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  it("reveals cleanly with no eligible cards and lets the player order all 4 cards on the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-027", as: "base" }],
          hand: [{ card: "EX3-031", as: "veedramon" }],
          deck: [
            { card: "BT1-028", as: "digivolutionBonusDraw" },
            { card: "BT1-029", as: "first" },
            { card: "BT1-030", as: "second" },
            { card: "BT1-031", as: "third" },
            { card: "BT1-032", as: "fourth" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(0);
    const order = ["fourth", "second", "first", "third"].map((alias) => s.inst(alias).instanceId);
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "orderCards",
      sourceCardId: "EX3-031",
      options: {
        timing: "WhenDigivolving",
        effectText: expect.stringContaining("bottom of your deck in any order"),
        candidateInstanceIds: expect.arrayContaining(order),
        visibleInstanceIds: expect.arrayContaining(order),
        orderDestination: "deckBottom",
        min: 4,
        max: 4,
      },
    });
    respond(s, { kind: "orderCards", order });
    await settle(() =>
      s.events.some(
        (event) =>
          event.kind === "cardsMoved" &&
          event.to === "deck" &&
          event.instanceIds.length === 4 &&
          event.instanceIds.every((instanceId, index) => instanceId === order[index]),
      ),
    );

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(order);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("digivolutionBonusDraw").instanceId,
    ]);
  });

  it("inherited family: grants Rush only to the first newly played Four Great Dragon this turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-033", under: [{ card: "EX3-031" }], as: "inheritedHost" },
          { card: "BT1-053", as: "olderAlly" },
        ],
        hand: [
          { card: "EX3-035", as: "firstDragon" },
          { card: "EX3-036", as: "secondDragon" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("firstDragon").instanceId]);
    const first = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("firstDragon").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(first, "Rush"));
    await advance(s.engine).verb.playInstances([s.inst("secondDragon").instanceId]);
    const second = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("secondDragon").instanceId,
    )!;
    await settle();

    expect(observe(s.engine).hasKeyword(first, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(second, "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("olderAlly"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("inheritedHost"), "Rush")).toBe(false);
  });

  it("inherited Rush lets the newly played Four Great Dragon attack immediately and expires after the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-033", under: [{ card: "EX3-031" }], as: "host" }],
        hand: [
          { card: "EX3-035", as: "dragon" },
          { card: "EX3-036", as: "nextTurnDragon" },
        ],
        deck: ["BT1-003", "BT1-004"],
      },
      1: { security: ["BT1-001", "BT1-002"], deck: ["BT1-005", "BT1-006"] },
    });
    s.state.turnCount = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("dragon").instanceId]);
    const dragon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("dragon").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(dragon, "Rush"));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: dragon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
    expect(s.state.players[1]!.security).toHaveLength(1);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).hasKeyword(dragon, "Rush")).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await advance(s.engine).verb.playInstances([s.inst("nextTurnDragon").instanceId]);
    const nextTurnDragon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("nextTurnDragon").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(nextTurnDragon, "Rush"));
    expect(observe(s.engine).hasKeyword(nextTurnDragon, "Rush")).toBe(true);
  });

  it("two inherited copies install independent watchers without bypassing each copy's once-per-turn limit", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-033", under: [{ card: "EX3-031" }], as: "firstHost" },
          { card: "EX3-033", under: [{ card: "EX3-031" }], as: "secondHost" },
        ],
        hand: [
          { card: "EX3-035", as: "firstDragon" },
          { card: "EX3-036", as: "secondDragon" },
          { card: "EX3-034", as: "thirdDragon" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).recompute();
    await advance(s.engine).recompute();
    expect(observe(s.engine).subscriptions("whenPlayed")).toHaveLength(2);

    await advance(s.engine).verb.playInstances([s.inst("firstDragon").instanceId]);
    const first = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("firstDragon").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(first, "Rush"));
    await advance(s.engine).verb.playInstances([s.inst("secondDragon").instanceId]);
    const second = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("secondDragon").instanceId,
    )!;
    await settle();
    await advance(s.engine).verb.playInstances([s.inst("thirdDragon").instanceId]);
    const third = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("thirdDragon").instanceId,
    )!;
    await settle();

    expect(observe(s.engine).hasKeyword(first, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(second, "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(third, "Rush")).toBe(false);
    expect(observe(s.engine).subscriptions("whenPlayed")).toHaveLength(2);
  });

  it("Q3664 triggers once for a simultaneous play and lets the player give Rush to either of those Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-033", under: [{ card: "EX3-031" }], as: "host" },
          { card: "BT1-053", as: "olderAlly" },
        ],
        hand: [
          { card: "EX3-025", as: "firstDragon" },
          { card: "EX3-035", as: "secondDragon" },
          { card: "BT1-053", as: "simultaneousUnrelated" },
        ],
      },
    });
    await s.ready();

    const play = advance(s.engine).verb.playInstances([
      s.inst("firstDragon").instanceId,
      s.inst("secondDragon").instanceId,
      s.inst("simultaneousUnrelated").instanceId,
    ]);
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const first = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("firstDragon").instanceId,
    )!;
    const second = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("secondDragon").instanceId,
    )!;
    const simultaneousUnrelated = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("simultaneousUnrelated").instanceId,
    )!;
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-031",
      options: {
        timing: "YourTurn",
        effectText: expect.stringContaining("1 of those Digimon gains"),
        candidateInstanceIds: expect.arrayContaining([first.permanentId, second.permanentId]),
        min: 1,
        max: 1,
      },
    });
    expect(candidates(s.state.pendingDecision!.payloadJson)).toEqual(
      expect.arrayContaining([first.permanentId, second.permanentId]),
    );
    expect(candidates(s.state.pendingDecision!.payloadJson)).toHaveLength(2);
    expect(candidates(s.state.pendingDecision!.payloadJson)).not.toContain(simultaneousUnrelated.permanentId);
    expect(candidates(s.state.pendingDecision!.payloadJson)).not.toContain(s.perm("olderAlly").permanentId);
    respond(s, { kind: "chooseTargets", instanceIds: [second.permanentId] });
    await play;
    await settle(() => observe(s.engine).hasKeyword(second, "Rush"));

    expect(observe(s.engine).hasKeyword(first, "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(second, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(simultaneousUnrelated, "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("olderAlly"), "Rush")).toBe(false);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-031" && req.kind === "chooseTargets"),
    ).toHaveLength(1);
  });

  it("does not grant inherited Rush outside your turn or for a non-Four Great Dragons play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-033", under: [{ card: "EX3-031" }], as: "host" }],
        hand: [
          { card: "EX3-035", as: "dragon" },
          { card: "BT1-053", as: "unrelated" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("dragon").instanceId]);
    s.state.turnSeat = 0;
    await advance(s.engine).verb.playInstances([s.inst("unrelated").instanceId]);
    const dragon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("dragon").instanceId,
    )!;
    const unrelated = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("unrelated").instanceId,
    )!;
    await settle();

    expect(observe(s.engine).hasKeyword(dragon, "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(unrelated, "Rush")).toBe(false);
  });
});
