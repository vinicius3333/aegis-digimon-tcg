import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./EX9-069.js";
import "../index.js";

describe("EX9-069", () => {
  it("reacts to Analogman's hidden placement under a non-DM Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-069", as: "youth" },
            { card: "EX9-068", as: "analogman" },
          ],
          hand: [{ card: "BT1-024", as: "played" }, "BT1-009"],
          deck: ["BT1-010", "BT1-048", "BT1-046"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const playedId = s.inst("played").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle();
    expect(s.perm("youth").isSuspended).toBe(true);
    expect(s.perm("analogman").isSuspended).toBe(true);
    expect(
      s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === playedId)?.stack[0],
    ).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-048"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("does not react to the face-up source added by a normal digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-069", as: "tamer" },
            { card: "BT1-009", as: "host" },
          ],
          hand: [{ card: "BT1-016", as: "evo" }],
          deck: ["BT1-048", "BT1-046"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("BT1-016");
    expect(s.perm("host").stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual([
      { cardId: "BT1-009", faceUp: true },
    ]);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("Reboot actually unsuspends face-down hosts on the opponent's turn, including a non-DM host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-069", as: "tamer" },
          { card: "EX9-063", as: "dm", suspended: true, under: [{ card: "BT1-046", faceUp: false }] },
          { card: "BT1-024", as: "other", suspended: true, under: [{ card: "BT1-046", faceUp: false }] },
          { card: "BT1-024", as: "faceUp", suspended: true, under: ["BT1-016"] },
        ],
      },
      1: { deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Reboot")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("dm").isSuspended).toBe(false);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(s.perm("faceUp").isSuspended).toBe(true);
    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("dm"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Reboot")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([
    { host: "EX9-063", decline: true },
    { host: "BT1-024", decline: false },
  ])("preserves the hand for declined or non-DM start-main placement ($host)", async ({ host, decline }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-069", as: "tamer" },
            { card: host, as: "host" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: !decline, autoDeclineOptional: decline, autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    await settle();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
  it.each([
    { breeding: false, decline: false, hand: 7, gain: 1, draw: 1 },
    { breeding: false, decline: false, hand: 8, gain: 1, draw: 0 },
    { breeding: false, decline: true, hand: 7, gain: 0, draw: 0 },
    { breeding: true, decline: false, hand: 7, gain: 0, draw: 0 },
  ])(
    "Q4829/Q4978 uses real Training with breeding=$breeding, decline=$decline and hand=$hand",
    async ({ breeding, decline, hand, gain, draw }) => {
      const host = { card: "EX9-008", as: "host" };
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX9-069", as: "tamer" }, ...(!breeding ? [host] : [])],
            ...(breeding ? { breeding: host } : {}),
            hand: Array.from({ length: hand }, () => "BT1-009"),
            deck: ["BT1-046", "BT1-010", "BT1-011"],
          },
        },
        { autoAcceptOptional: !decline, autoDeclineOptional: decline },
      );
      await s.ready();
      const ability = observe(s.engine).activatableEffects(s.perm("host"))[0];
      expect(ability).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.perm("host").topCard.instanceId,
          effectKey: ability!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("host").stack[0]).toMatchObject({ cardId: "BT1-046", faceUp: false });
      expect(s.perm("host").isSuspended).toBe(true);
      expect(s.perm("tamer").isSuspended).toBe(gain === 1);
      expect(s.state.memory).toBe(gain);
      expect(s.state.players[0]!.hand).toHaveLength(hand + draw);
      expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(draw ? ["BT1-011"] : ["BT1-010", "BT1-011"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("Q4830 resolves both derived placement reactions before the second start-main effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-069", as: "first" },
            { card: "EX9-069", as: "second" },
            { card: "EX9-063", as: "host" },
          ],
          hand: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    // The real start-main window triggers both Tamers simultaneously.
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const first = s.state.pendingDecision!;
    expect(first.kind).toBe("orderTriggers");
    const firstKeys = (JSON.parse(first.payloadJson) as { triggerKeys: string[] }).triggerKeys;
    expect(firstKeys).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "orderTriggers", order: [firstKeys[0]!] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "orderTriggers" && s.state.pendingDecision.decisionId !== first.decisionId,
    );
    const derived = s.state.pendingDecision!;
    const derivedKeys = (JSON.parse(derived.payloadJson) as { triggerKeys: string[] }).triggerKeys;
    expect(derivedKeys).toHaveLength(2);
    expect(derivedKeys).toEqual([expect.stringContaining("::subtrigger/"), expect.stringContaining("::subtrigger/")]);
    expect(s.perm("host").stack).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: derived.decisionId,
        response: { kind: "orderTriggers", order: [derivedKeys[1]!] },
      }),
    ).toEqual({ ok: true });
    await settle();
    const events = s.events
      .filter((event) => event.kind === "effectTriggered")
      .filter((event) => event.sourceCardId === "EX9-069");
    expect(events.map((event) => event.effectKey.startsWith("subtrigger/"))).toEqual([false, true, true, false]);
    // The second placement triggers both watchers again, but suspended Tamers
    // cannot pay again. This is a new derived batch, not an older parent choice.
    const repeated = s.state.pendingDecision!;
    expect(repeated.kind).toBe("orderTriggers");
    const repeatedKeys = (JSON.parse(repeated.payloadJson) as { triggerKeys: string[] }).triggerKeys;
    expect(repeatedKeys).toEqual([expect.stringContaining("::subtrigger/"), expect.stringContaining("::subtrigger/")]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: repeated.decisionId,
        response: { kind: "orderTriggers", order: [repeatedKeys[0]!] },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-009"]);
    expect(s.perm("host").stack.every((card) => !card.faceUp)).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-012"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
  const source = {
    instanceId: "source",
    cardId: "EX9-069",
    ownerSeat: 0,
    definition: {},
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  } as never;
  it("registers start-main placement and security play", () => {
    expect(getEffectModule("EX9-069")!.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(1);
    expect(getEffectModule("EX9-069")!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
  it("registers memory/draw on adding digivolution cards and opponent-turn Reboot", () =>
    expect(getEffectModule("EX9-069")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(2));
  it("encodes face-down battle-area placement reactions as compiled IR", () => {
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" },
          addedDigivolutionCardFilter: { faceDown: true },
          cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
          actions: [
            { kind: "GainMemory", amount: 1 },
            { kind: "Draw", amount: 1 },
          ],
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [{ kind: "GainKeyword", target: { filter: { digivolutionCards: "hasFaceDown" } } }],
    });
  });
  it("places a hand card face-down under a DM Digimon at the start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-069", as: "source" },
            { card: "BT1-024", as: "other" },
            { card: "EX9-065", as: "host", under: ["EX9-063"] },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const turn = s.engine.runOneTurn();
    await settle();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("other").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);

    expect(s.perm("host").stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual([
      { cardId: "BT1-009", faceUp: false },
      { cardId: "EX9-063", faceUp: true },
    ]);
    expect(s.perm("other").stack).toHaveLength(0);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
  it("grants Reboot to own Digimon with face-down sources during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-069", as: "source" },
          { card: "EX9-065", as: "host", under: [{ card: "BT1-009", faceUp: false }] },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
  it("does not react when a face-down card is placed under a breeding Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-069", as: "source" }],
          breeding: { card: "EX9-065", as: "breeding", under: [{ card: "BT1-009", faceUp: false }] },
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("breeding").permanentId,
      addedDigivolutionCardInstanceIds: [s.perm("breeding").stack[0]!.instanceId],
    });

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
  it("plays itself from security without paying", async () => {
    const s = setupEngine({
      0: { security: ["EX9-069", "BT1-048"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-069"]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
