import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-030.js";
import "../index.js"; // the full catalog is registered in a real match

function payload(s: EngineSetup): Record<string, unknown> {
  return JSON.parse(s.state.pendingDecision!.payloadJson) as Record<string, unknown>;
}

function candidates(s: EngineSetup): string[] {
  return (payload(s).candidateInstanceIds as string[] | undefined) ?? [];
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

describe("EX3-030 Gatomon", () => {
  it("has the official errata identity and digivolves from a yellow level 3 for 2", async () => {
    const definition = getCardDefinition("EX3-030")!;
    expect(definition).toMatchObject({
      cardId: "EX3-030",
      nameEn: "Gatomon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Holy Beast"],
      rarity: "C",
      imageId: "EX3-030-Errata",
    });
    expect(definition.effectText).toContain("[Angel], [Cherub], [Throne], [Authority], [Seraph] or [Virtue]");
    expect(definition.effectText).toContain("other than [Three Great Angels]");
    expect(definition.inheritedEffectText).toContain("1 of those Digimon gains ＜Rush＞ for the turn");

    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-027", as: "base" }],
        hand: [{ card: "EX3-030", as: "gatomon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gatomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-030");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("Angel/Four Great Dragons family: the errata search adds both mandatory categories", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-030", as: "gatomon" }],
          deck: [
            { card: "BT1-062", as: "authority" },
            { card: "BT1-063", as: "excludedThreeGreatAngels" },
            { card: "EX3-025", as: "fourGreatDragon" },
            { card: "BT1-029", as: "filler" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const revealed = ["authority", "excludedThreeGreatAngels", "fourGreatDragon", "filler"].map(
      (alias) => s.inst(alias).instanceId,
    );
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-030",
      options: {
        timing: "OnPlay",
        effectText: expect.stringContaining("other than [Three Great Angels]"),
        candidateInstanceIds: [s.inst("authority").instanceId],
        visibleInstanceIds: expect.arrayContaining(revealed),
        visibleCards: expect.arrayContaining(revealed.map((instanceId) => expect.objectContaining({ instanceId }))),
        min: 1,
        max: 1,
      },
    });
    const firstDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    respond(s, { kind: "selectCards", instanceIds: [s.inst("authority").instanceId] });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-030",
      options: {
        timing: "OnPlay",
        effectText: expect.stringContaining("[Four Great Dragons]"),
        candidateInstanceIds: [s.inst("fourGreatDragon").instanceId],
        visibleInstanceIds: expect.arrayContaining(revealed),
        min: 1,
        max: 1,
      },
    });
    const secondDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    respond(s, { kind: "selectCards", instanceIds: [s.inst("fourGreatDragon").instanceId] });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const restOrder = [s.inst("filler").instanceId, s.inst("excludedThreeGreatAngels").instanceId];
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "orderCards",
      sourceCardId: "EX3-030",
      options: {
        timing: "OnPlay",
        effectText: expect.stringContaining("bottom of your deck in any order"),
        candidateInstanceIds: expect.arrayContaining(restOrder),
        visibleInstanceIds: expect.arrayContaining(restOrder),
        orderDestination: "deckBottom",
        min: 2,
        max: 2,
      },
    });
    expect(candidates(s)).toEqual(expect.arrayContaining(restOrder));
    expect(candidates(s)).toHaveLength(2);
    expect(payload(s).visibleInstanceIds).toEqual(expect.arrayContaining(restOrder));
    expect(payload(s).visibleInstanceIds).toHaveLength(2);
    respond(s, { kind: "orderCards", order: restOrder });
    await settle(() =>
      s.events.some(
        (event) =>
          event.kind === "cardsMoved" &&
          event.to === "deck" &&
          event.instanceIds.length === restOrder.length &&
          event.instanceIds.every((instanceId, index) => instanceId === restOrder[index]),
      ),
    );

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-062", "EX3-025"]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(restOrder);
    expect(s.state.memory).toBe(0);
  });

  it.each([
    ["Angel", "BT1-053"],
    ["Throne", "BT4-047"],
    ["Authority", "BT1-062"],
    ["Seraph", "EX4-050"],
    ["Virtue", "BT3-042"],
  ])("Q3406 adds the sole eligible yellow %s card when no Four Great Dragon is revealed", async (_trait, cardId) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-030", as: "gatomon" }],
          deck: [{ card: cardId, as: "eligible" }, "BT1-029", "BT1-030", "BT1-031"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("eligible").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("eligible").instanceId]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  it("Q3406 adds the sole Four Great Dragon when no eligible yellow angel-family card is revealed", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-030", as: "gatomon" }],
          deck: [{ card: "EX3-025", as: "dragon" }, "BT1-029", "BT1-030", "BT1-031"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("dragon").instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("dragon").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("dragon").instanceId]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  it("excludes off-color Angels and every Three Great Angels overlap, then orders all revealed cards on deck bottom", async () => {
    // The current catalog has no yellow Cherub card outside [Three Great Angels]. BT3-041
    // therefore proves the meaningful live boundary: Cherub qualifies for the family token,
    // but the errata's explicit exclusion wins. A future standalone yellow Cherub is covered by
    // the same union filter already exercised by the other five accepted trait families above.
    expect(getCardDefinition("BT3-041")?.types).toEqual(expect.arrayContaining(["Cherub", "Three Great Angels"]));
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-030", as: "gatomon" }],
          deck: [
            { card: "BT3-023", as: "blueAngel" },
            { card: "BT3-041", as: "threeAngelsCherub" },
            { card: "BT2-040", as: "threeAngelsThrone" },
            { card: "BT1-063", as: "threeAngelsSeraph" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(0);
    const order = ["threeAngelsSeraph", "blueAngel", "threeAngelsThrone", "threeAngelsCherub"].map(
      (alias) => s.inst(alias).instanceId,
    );
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "orderCards",
      sourceCardId: "EX3-030",
      options: {
        timing: "OnPlay",
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
          event.instanceIds.every((instanceId, index) => instanceId === order[index]),
      ),
    );

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(order);
  });

  it("inherited family: grants Rush only to the newly played Four Great Dragon and permits its immediate attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-056", under: [{ card: "EX3-030" }], as: "inheritedHost" },
          { card: "BT1-053", as: "olderAlly" },
        ],
        hand: [
          { card: "EX3-035", as: "firstDragon" },
          { card: "EX3-036", as: "secondDragon" },
        ],
      },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    s.state.turnCount = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("firstDragon").instanceId]);
    const firstDragon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("firstDragon").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(firstDragon, "Rush"));

    expect(observe(s.engine).hasKeyword(firstDragon, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("olderAlly"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("inheritedHost"), "Rush")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: firstDragon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    await advance(s.engine).verb.playInstances([s.inst("secondDragon").instanceId]);
    const secondDragon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("secondDragon").instanceId,
    )!;
    await settle();

    expect(observe(s.engine).hasKeyword(secondDragon, "Rush")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: secondDragon.permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("expires inherited Rush at turn end and resets once-per-turn for the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-056", under: [{ card: "EX3-030" }], as: "host" }],
        hand: [
          { card: "EX3-035", as: "firstDragon" },
          { card: "EX3-036", as: "nextTurnDragon" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { deck: ["BT1-003", "BT1-004"] },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("firstDragon").instanceId]);
    const first = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("firstDragon").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(first, "Rush"));
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).hasKeyword(first, "Rush")).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await advance(s.engine).verb.playInstances([s.inst("nextTurnDragon").instanceId]);
    const next = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("nextTurnDragon").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(next, "Rush"));
    expect(observe(s.engine).hasKeyword(next, "Rush")).toBe(true);
  });

  it("two inherited copies resolve independently on one simultaneous play and each keeps its own OPT", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-056", under: [{ card: "EX3-030" }], as: "firstHost" },
          { card: "BT1-056", under: [{ card: "EX3-030" }], as: "secondHost" },
        ],
        hand: [
          { card: "EX3-035", as: "firstDragon" },
          { card: "EX3-036", as: "secondDragon" },
          { card: "EX3-034", as: "laterDragon" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).recompute();
    await advance(s.engine).recompute();
    // Scoped to the two hosts: other registered cards on the board install their own
    // `whenPlayed` watchers, which say nothing about these two inherited copies.
    expect(observe(s.engine).subscriptions("whenPlayed", s.perm("firstHost").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("whenPlayed", s.perm("secondHost").permanentId)).toHaveLength(1);

    const play = advance(s.engine).verb.playInstances([
      s.inst("firstDragon").instanceId,
      s.inst("secondDragon").instanceId,
    ]);
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const first = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("firstDragon").instanceId,
    )!;
    const second = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("secondDragon").instanceId,
    )!;
    expect(candidates(s)).toEqual(expect.arrayContaining([first.permanentId, second.permanentId]));
    expect(candidates(s)).toHaveLength(2);
    respond(s, { kind: "chooseTargets", instanceIds: [first.permanentId] });

    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" &&
        s.decisions.filter(({ req }) => req.sourceCardId === "EX3-030" && req.kind === "chooseTargets").length === 2,
    );
    expect(candidates(s)).toEqual(expect.arrayContaining([first.permanentId, second.permanentId]));
    expect(candidates(s)).toHaveLength(2);
    respond(s, { kind: "chooseTargets", instanceIds: [second.permanentId] });
    await play;
    await settle(() => observe(s.engine).hasKeyword(first, "Rush") && observe(s.engine).hasKeyword(second, "Rush"));

    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-030" && req.kind === "chooseTargets"),
    ).toHaveLength(2);
    await advance(s.engine).recompute();
    await advance(s.engine).recompute();
    expect(observe(s.engine).subscriptions("whenPlayed", s.perm("firstHost").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("whenPlayed", s.perm("secondHost").permanentId)).toHaveLength(1);

    await advance(s.engine).verb.playInstances([s.inst("laterDragon").instanceId]);
    const later = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("laterDragon").instanceId,
    )!;
    await settle();

    expect(observe(s.engine).hasKeyword(first, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(second, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(later, "Rush")).toBe(false);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-030" && req.kind === "chooseTargets"),
    ).toHaveLength(2);
    expect(observe(s.engine).subscriptions("whenPlayed", s.perm("firstHost").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("whenPlayed", s.perm("secondHost").permanentId)).toHaveLength(1);
  });

  it("Q3664 triggers once and offers exactly the Four Great Dragons from one simultaneous play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-056", under: [{ card: "EX3-030" }], as: "host" },
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
    const unrelated = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("simultaneousUnrelated").instanceId,
    )!;
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-030",
      options: {
        timing: "YourTurn",
        effectText: expect.stringContaining("1 of those Digimon gains"),
        candidateInstanceIds: expect.arrayContaining([first.permanentId, second.permanentId]),
        min: 1,
        max: 1,
      },
    });
    expect(candidates(s)).toEqual(expect.arrayContaining([first.permanentId, second.permanentId]));
    expect(candidates(s)).toHaveLength(2);
    expect(candidates(s)).not.toContain(unrelated.permanentId);
    expect(candidates(s)).not.toContain(s.perm("olderAlly").permanentId);
    respond(s, { kind: "chooseTargets", instanceIds: [second.permanentId] });
    await play;
    await settle(() => observe(s.engine).hasKeyword(second, "Rush"));

    expect(observe(s.engine).hasKeyword(first, "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(second, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(unrelated, "Rush")).toBe(false);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-030" && req.kind === "chooseTargets"),
    ).toHaveLength(1);
  });

  it("does not grant inherited Rush when a Four Great Dragon is played on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-056", under: [{ card: "EX3-030" }], as: "host" }],
        hand: [{ card: "EX3-035", as: "dragon" }],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("dragon").instanceId]);
    const dragon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("dragon").instanceId,
    )!;
    await settle();

    expect(observe(s.engine).hasKeyword(dragon, "Rush")).toBe(false);
  });

  it("does not grant inherited Rush to an unrelated Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-056", under: [{ card: "EX3-030" }], as: "host" }],
        hand: [{ card: "BT1-053", as: "angel" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("angel").instanceId]);
    const angel = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("angel").instanceId,
    )!;
    await settle();

    expect(observe(s.engine).hasKeyword(angel, "Rush")).toBe(false);
  });
});
