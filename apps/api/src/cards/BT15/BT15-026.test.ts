import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-026.js";

describe("BT15-026", () => {
  it("matches the catalog identity, ACE fields, and blue level-4 evolution route", () => {
    expect(getCardDefinition("BT15-026")).toMatchObject({
      nameEn: "WereGarurumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 4,
      dp: 7000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      types: ["Beastkin"],
      isAce: true,
      overflowMemory: 3,
    });
  });

  it("publishes Blast Digivolve at Counter Timing", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    }));

  it("draws and may trash a hand card when played or digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Draw", amount: 1 },
        { kind: "Trash", condition: { kind: "zoneCount", value: 5 } },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash" }],
    });
  });
  it("once per turn restricts an opposing Digimon or Tamer after your Digimon effect adds to hand", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          fireCondition: { kind: "triggerByYourDigimonEffect" },
          actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }],
        },
      ],
    }));

  it("after its On Play draw reaches 5 cards, trashes one yet still locks a Tamer per Q2507", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT15-026", as: "wereGarurumon" },
            { card: "BT1-009", as: "keptOne" },
            { card: "BT1-009", as: "keptTwo" },
            { card: "BT1-009", as: "keptThree" },
            { card: "BT1-009", as: "keptFour" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-086", as: "tamerTarget" },
            { card: "BT1-009", as: "digimonPeer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wereGarurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.length === 1 &&
        observe(s.engine).isRestricted(s.perm("tamerTarget"), "suspend"),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("tamerTarget"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("digimonPeer"), "suspend")).toBe(false);
  });

  it("when digivolving below the threshold, draws without trashing and locks one Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-025", as: "base" }],
          hand: [
            { card: "BT15-026", as: "wereGarurumon" },
            { card: "BT1-009", as: "keptOne" },
            { card: "BT1-009", as: "keptTwo" },
          ],
          deck: [
            { card: "BT1-001", as: "normalDraw" },
            { card: "BT1-009", as: "effectDraw" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wereGarurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("effectDraw").instanceId) &&
        observe(s.engine).isRestricted(s.perm("target"), "suspend"),
    );

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("Blast Digivolves from hand during Counter Timing without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT15-025", as: "base" }],
          hand: [{ card: "BT15-026", as: "wereGarurumon" }],
          deck: ["BT1-001", "BT1-009"],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("wereGarurumon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT15-026");

    expect(s.state.memory).toBe(0);
  });

  it("loses 3 memory to Overflow when it leaves the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT15-026", as: "wereGarurumon" }] } });
    s.state.memory = 0;
    await s.ready();
    const sourceId = s.perm("wereGarurumon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([sourceId])).toBe(1);
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourceId));

    expect(s.state.memory).toBe(-3);
  });

  it("requires an explicit one-card trash choice at the exact post-draw boundary", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT15-026", as: "wereGarurumon" },
          { card: "BT1-009", as: "chosenTrash" },
          { card: "BT1-009", as: "keptOne" },
          { card: "BT1-009", as: "keptTwo" },
          { card: "BT1-009", as: "keptThree" },
        ],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });

    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wereGarurumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const pending = s.decisions.find(({ req }) => req.kind === "selectCards")!;
    expect(pending.req.options).toMatchObject({ min: 1, max: 1 });
    expect(pending.req.options?.candidateInstanceIds).toHaveLength(5);
    expect(
      s.engine.applyIntent(pending.seat, {
        type: "respondDecision",
        decisionId: pending.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("chosenTrash").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("chosenTrash").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("ignores cards added by an owned non-Digimon effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-026", as: "wereGarurumon" }],
        hand: [{ card: "BT1-097", as: "option" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(false);
  });

  it("ignores cards added by an opponent's Digimon effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-026", as: "watcher" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          hand: [{ card: "BT15-026", as: "opponentWereGarurumon" }],
          deck: [{ card: "BT1-009", as: "opponentDraw" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentWereGarurumon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponentDraw").instanceId));

    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(false);
  });

  it("ignores the ordinary rule draw from digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-026", as: "watcher" },
            { card: "BT15-020", as: "base" },
          ],
          hand: [{ card: "BT15-025", as: "seadramon" }],
          deck: [{ card: "BT1-009", as: "normalDraw" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("seadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalDraw").instanceId));

    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(false);
  });

  it("rejects a second qualifying addition in the turn and resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-026", as: "watcher" }],
          hand: [
            { card: "BT15-026", as: "firstSource" },
            { card: "BT15-026", as: "secondSource" },
            { card: "BT15-026", as: "thirdSource" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget" },
            { card: "BT1-009", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const firstId = s.perm("firstTarget").permanentId;

    await advance(s.engine).verb.playInstances([s.inst("firstSource").instanceId], "BT14-038");
    await settle(() => observe(s.engine).isRestricted(s.perm("firstTarget"), "suspend"));
    await advance(s.engine).verb.deletePermanent([firstId]);
    await advance(s.engine).verb.playInstances([s.inst("secondSource").instanceId], "BT14-038");

    expect(observe(s.engine).isRestricted(s.perm("secondTarget"), "suspend")).toBe(false);
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).verb.playInstances([s.inst("thirdSource").instanceId], "BT14-038");
    await settle(() => observe(s.engine).isRestricted(s.perm("secondTarget"), "suspend"));

    expect(observe(s.engine).isRestricted(s.perm("secondTarget"), "suspend")).toBe(true);
  });

  it("keeps the suspend lock through the opponent turn and expires at its exact end boundary", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-026", as: "wereGarurumon" }], deck: ["BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );

    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wereGarurumon").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "suspend"));

    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(false);
  });
});
