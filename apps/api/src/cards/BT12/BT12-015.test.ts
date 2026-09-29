import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import "../BT5/BT5-091.js";
import "../EX3/EX3-053.js";
import { compiled } from "./BT12-015.js";
import "./BT12-088.js";

const HAND_MAIN_EFFECT_KEY = "BT12-015/hand-main-stack-and-digivolve";

describe("BT12-015 Aldamon", () => {
  it("registers the hand effect as one compiled, bound, ordered operation", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        effectKey: HAND_MAIN_EFFECT_KEY,
        trigger: "Main",
        isFromHand: true,
        condition: expect.objectContaining({
          kind: "allOf",
          conditions: expect.arrayContaining([
            expect.objectContaining({ kind: "memoryAtLeast", controller: "mine", value: -7 }),
          ]),
        }),
        actions: [
          expect.objectContaining({
            kind: "SelectBind",
            target: expect.objectContaining({ bindAs: "bt12_015_takuya" }),
          }),
          expect.objectContaining({
            kind: "PlaceUnder",
            order: "any",
            underSelectionRef: "bt12_015_takuya",
            target: expect.objectContaining({
              requiredNamesExact: ["Agunimon", "BurningGreymon"],
            }),
          }),
          expect.objectContaining({
            kind: "Digivolve",
            source: "triggerSource",
            costOverride: 3,
            virtualBase: { level: 4, colors: ["Red"] },
            target: expect.objectContaining({ fromSelectionRef: "bt12_015_takuya" }),
          }),
        ],
      }),
      expect.objectContaining({
        effectKey: "BT12-015/return-takuya",
        trigger: "OnDeletion",
      }),
    ]);
  });

  it("uses its [Hand][Main] effect to stack both trash materials and digivolve Takuya", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-015", as: "aldamon" }],
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          trash: [
            { card: "BT12-012", as: "agunimon" },
            { card: "BT12-013", as: "burning" },
          ],
          deck: ["BT1-009"],
        },
      },
      {
        autoSelectCards: true,
        autoOrderTriggers: true,
        autoOrderCards: false,
      },
    );
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");
    const takuyaInstanceId = s.perm("takuya").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: HAND_MAIN_EFFECT_KEY,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.state.pendingDecision!;
    const requestedOrder = [s.inst("burning").instanceId, s.inst("agunimon").instanceId];
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("BT12-015");
    expect(JSON.parse(order.payloadJson)).toMatchObject({
      candidateInstanceIds: expect.arrayContaining(requestedOrder),
      visibleInstanceIds: expect.arrayContaining(requestedOrder),
      min: 2,
      max: 2,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderCards", order: requestedOrder },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("takuya").topCard.instanceId === aldamon.instanceId);

    expect(s.perm("takuya").topCard.cardId).toBe("BT12-015");
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toEqual([...requestedOrder, takuyaInstanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining(requestedOrder),
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === aldamon.instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.state.memory).toBe(0);
  });

  it("keeps both ordered materials under the Takuya selected by the controller", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-015", as: "aldamon" }],
          battleArea: [
            { card: "BT12-088", as: "first" },
            { card: "BT12-088", as: "second" },
          ],
          trash: [
            { card: "BT12-012", as: "agunimon" },
            { card: "BT12-013", as: "burning" },
          ],
        },
      },
      { autoOrderTriggers: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    const aldamon = s.inst("aldamon");
    const secondInstanceId = s.perm("second").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: HAND_MAIN_EFFECT_KEY,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const orderDecision = s.state.pendingDecision!;
    const requestedOrder = [s.inst("burning").instanceId, s.inst("agunimon").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision.decisionId,
        response: { kind: "orderCards", order: requestedOrder },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("second").topCard.instanceId === aldamon.instanceId);
    expect(s.perm("first").topCard.cardId).toBe("BT12-088");
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack.map(({ instanceId }) => instanceId)).toEqual([...requestedOrder, secondInstanceId]);
    expect(s.perm("second").topCard.cardId).toBe("BT12-015");
    expect(s.state.memory).toBe(0);
  });

  it("does not activate or move the first material when BurningGreymon is absent", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT12-015", as: "aldamon" }],
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        trash: [{ card: "BT12-012", as: "agunimon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");

    expect(aldamon.activatableEffectsJson).toBe("");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: HAND_MAIN_EFFECT_KEY,
      }).ok,
    ).toBe(false);
    await settle();

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("agunimon").instanceId);
    expect(s.perm("takuya").stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it.each([
    ["Agunimon is absent", [{ card: "BT12-013", as: "burning" }], "BT12-088", 3],
    [
      "the only Tamer is not Takuya",
      [
        { card: "BT12-012", as: "agunimon" },
        { card: "BT12-013", as: "burning" },
      ],
      "BT12-089",
      3,
    ],
    [
      "the digivolution cost would exceed the memory gauge minimum",
      [
        { card: "BT12-012", as: "agunimon" },
        { card: "BT12-013", as: "burning" },
      ],
      "BT12-088",
      -8,
    ],
  ])("does not surface the hand effect when %s", async (_case, trash, tamer, memory) => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT12-015", as: "aldamon" }],
        battleArea: [{ card: tamer, as: "tamer" }],
        trash,
      },
    });
    s.state.memory = memory;
    await s.ready();
    expect(s.inst("aldamon").activatableEffectsJson).toBe("");
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("does not expose the [Hand][Main] effect after Aldamon has entered the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-015", as: "aldamon" },
          { card: "BT12-088", as: "takuya" },
        ],
        trash: [
          { card: "BT12-012", as: "agunimon" },
          { card: "BT12-013", as: "burning" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.inst("aldamon").activatableEffectsJson).toBe("");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("aldamon").instanceId,
        effectKey: HAND_MAIN_EFFECT_KEY,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.perm("takuya").stack).toHaveLength(0);
  });

  it("returns Takuya from trash to hand on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-015", as: "aldamon" }],
          trash: [{ card: "BT12-088", as: "takuya" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("aldamon").permanentId]);
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("takuya").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("takuya").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("takuya").instanceId);
  });
});

describe("BT12-015 Aldamon — KB Q&A rulings", () => {
  function aldamonBoard(
    overrides: { takuya?: Pick<PermanentSpec, "enteredThisTurn">; battleArea?: PermanentSpec[] } = {},
  ) {
    return {
      hand: [{ card: "BT12-015", as: "aldamon" }],
      battleArea: [{ card: "BT12-088", as: "takuya", ...overrides.takuya }, ...(overrides.battleArea ?? [])],
      trash: [
        { card: "BT12-012", as: "agunimon" },
        { card: "BT12-013", as: "burning" },
      ],
      deck: [
        { card: "BT1-009", as: "bonusDraw" },
        { card: "BT1-010", as: "watcherDraw" },
      ],
    };
  }

  async function digivolveTakuyaIntoAldamon(s: EngineSetup): Promise<void> {
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("aldamon").instanceId,
        effectKey: HAND_MAIN_EFFECT_KEY,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.instanceId === s.inst("aldamon").instanceId);
  }

  async function lockOpponentDigivolutionWithMetallicdramon(s: EngineSetup): Promise<void> {
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("metallicdramon").instanceId]);
    await settle();
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX3-053"]);
    expect(s.state.memory).toBe(3);
  }

  it.fails("treats the Tamer as a Digimon: digivolution watchers trigger and a Digimon digivolve lock blocks it (Q6548)", async () => {
    const control = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-015", as: "aldamon" }],
          battleArea: [
            { card: "BT12-013", as: "burningOnField" },
            { card: "BT5-091", as: "watcher" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    control.state.memory = 3;
    await control.ready();
    expect(
      control.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: control.perm("burningOnField").permanentId,
        instanceId: control.inst("aldamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(control.perm("watcher").isSuspended).toBe(true);

    const watched = setupEngine(
      { 0: aldamonBoard({ battleArea: [{ card: "BT5-091", as: "watcher" }] }) },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await digivolveTakuyaIntoAldamon(watched);
    await settle();

    expect(watched.perm("watcher").isSuspended).toBe(true);
    expect(watched.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([watched.inst("bonusDraw").instanceId, watched.inst("watcherDraw").instanceId]),
    );

    const locked = setupEngine(
      {
        0: aldamonBoard({ battleArea: [{ card: "BT12-013", as: "burningOnField" }] }),
        1: { hand: [{ card: "EX3-053", as: "metallicdramon" }] },
      },
      { autoSelectCards: true },
    );
    await lockOpponentDigivolutionWithMetallicdramon(locked);

    const normalDigivolve = locked.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: locked.perm("burningOnField").permanentId,
      instanceId: locked.inst("aldamon").instanceId,
    });
    await settle();
    expect(normalDigivolve.ok).toBe(false);
    expect(locked.perm("burningOnField").topCard.cardId).toBe("BT12-013");

    locked.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: locked.inst("aldamon").instanceId,
      effectKey: HAND_MAIN_EFFECT_KEY,
    });
    await settle();
    expect(locked.perm("takuya").topCard.cardId).toBe("BT12-088");
    expect(locked.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      locked.inst("aldamon").instanceId,
    );
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q6549)", async () => {
    const s = setupEngine({ 0: aldamonBoard() }, { autoSelectCards: true });
    const deckBefore = s.state.players[0]!.deck.length;

    await digivolveTakuyaIntoAldamon(s);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(
      s.events.some((event) => event.kind === "digivolved" && event.permanentId === s.perm("takuya").permanentId),
    ).toBe(true);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q6550)", async () => {
    const attackPlayer = (s: EngineSetup) =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("takuya").permanentId,
        target: { kind: "player" },
      });

    const freshTamer = setupEngine(
      { 0: aldamonBoard({ takuya: { enteredThisTurn: true } }), 1: { security: 1 } },
      { autoSelectCards: true },
    );
    await digivolveTakuyaIntoAldamon(freshTamer);
    expect(attackPlayer(freshTamer).ok).toBe(false);
    expect(freshTamer.perm("takuya").isSuspended).toBe(false);

    const establishedTamer = setupEngine({ 0: aldamonBoard(), 1: { security: 1 } }, { autoSelectCards: true });
    await digivolveTakuyaIntoAldamon(establishedTamer);
    expect(attackPlayer(establishedTamer)).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves the field (Q6551)", async () => {
    const s = setupEngine({ 0: aldamonBoard() }, { autoSelectCards: true });
    await digivolveTakuyaIntoAldamon(s);
    const takuyaInstanceId = s.perm("takuya").stack.at(-1)!.instanceId;

    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toContain("BT12-088");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    await advance(s.engine).verb.returnToHand([s.inst("aldamon").instanceId]);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-015");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([takuyaInstanceId, s.inst("agunimon").instanceId, s.inst("burning").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6552)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-015", as: "aldamon", under: [{ card: "BT12-088", as: "takuyaSource" }] }],
        security: [{ card: "BT12-088", as: "securityTakuya" }],
      },
    });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.Security, s.perm("aldamon"));
    await settle();
    expect(s.perm("aldamon").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("takuyaSource").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("securityTakuya"));
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("securityTakuya").instanceId,
    );
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q6553)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-015", as: "withTakuya", under: ["BT12-012", "BT12-013", "BT12-088"] },
          { card: "BT12-015", as: "withoutTakuya", under: ["BT12-012", "BT12-013"] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("withTakuya").currentDP).toBe(s.perm("withoutTakuya").currentDP + 2000);
  });
});
