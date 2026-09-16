import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import compiled from "./EX10-023.js";
import "../index.js";

const CARD_ID = "EX10-023";

describe("EX10-023 Quartzmon", () => {
  it("matches the catalog and compiles the printed clause set", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Quartzmon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 9,
      dp: 15000,
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
      evoCosts: [
        { color: "Green", level: 6, memoryCost: 5 },
        { color: "Black", level: 6, memoryCost: 5 },
      ],
      isAce: true,
      overflowMemory: 5,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Counter",
          isFromHand: true,
          keywords: [expect.objectContaining({ keyword: "BlastDigivolve" })],
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [expect.objectContaining({ kind: "Suspend", target: expect.objectContaining({ count: "all" }) })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [expect.objectContaining({ kind: "Suspend", target: expect.objectContaining({ count: "all" }) })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          frequency: "OncePerTurn",
          sharedUseKey: "EX10-023/suspended-delete",
        }),
        expect.objectContaining({
          trigger: "WhenAttacking",
          frequency: "OncePerTurn",
          sharedUseKey: "EX10-023/suspended-delete",
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            expect.objectContaining({
              kind: "Restrict",
              restriction: "unsuspendDuringUnsuspendPhase",
              duration: "forTheTurn",
            }),
          ],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["Astamon"],
        cost: 7,
        isAlternate: true,
        controllerControls: { kind: ["Digimon", "Tamer"], namesExact: ["Ryoma Mogami"] },
      },
    ]);
  });

  it.each([
    ["Green Lv.6", "AD1-024"],
    ["Black Lv.6", "AD1-004"],
  ])("digivolves from a %s base for the printed cost of 5", async (_label, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: CARD_ID, as: "quartz" }, "BT1-013"],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quartz").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.perm("base").topCard.cardId === CARD_ID);

    expect(s.perm("base").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([baseCard]);
    expect(s.state.memory).toBe(0);
  });

  it("the cost-7 alternate route needs an [Astamon] base AND [Ryoma Mogami] in play", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-018", as: "astamon" },
          { card: "EX10-067", as: "ryoma" },
        ],
        hand: [{ card: CARD_ID, as: "quartz" }, "BT1-013"],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    legal.state.memory = 7;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("astamon").permanentId,
        instanceId: legal.inst("quartz").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => legal.perm("astamon").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("astamon").stack.map(({ cardId }) => cardId)).toEqual(["EX10-018"]);

    for (const fixture of [
      { label: "no Ryoma Mogami", battleArea: [{ card: "EX10-018", as: "base" }] },
      {
        label: "wrong base name",
        battleArea: [
          { card: "BT10-081", as: "base" },
          { card: "EX10-067", as: "ryoma" },
        ],
      },
    ]) {
      const s = setupEngine({
        0: { battleArea: fixture.battleArea, hand: [{ card: CARD_ID, as: "quartz" }, "BT1-013"] },
      });
      s.state.memory = 7;
      const refused = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quartz").instanceId,
        alternateRequirementIndex: 0,
      });
      expect({ label: fixture.label, ok: refused.ok }).toEqual({ label: fixture.label, ok: false });
    }
  });

  it("[On Play] played from hand suspends every other Digimon and Tamer on both sides", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "mine" },
          { card: "BT1-085", as: "myTamer" },
        ],
        hand: [{ card: CARD_ID, as: "quartz" }, "BT1-013"],
        deck: ["BT1-013", "BT1-014"],
      },
      1: {
        battleArea: [
          { card: "BT1-013", as: "theirs" },
          { card: "BT1-085", as: "theirTamer" },
        ],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 9;
    const quartzInstanceId = s.inst("quartz").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: quartzInstanceId })).toEqual({ ok: true });
    await settleAcrossTimers(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === quartzInstanceId) &&
        s.perm("theirTamer").isSuspended &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("quartz").isSuspended).toBe(false);
    expect(["mine", "myTamer", "theirs", "theirTamer"].map((alias) => [alias, s.perm(alias).isSuspended])).toEqual([
      ["mine", true],
      ["myTamer", true],
      ["theirs", true],
      ["theirTamer", true],
    ]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Digivolving] suspends the board and deletes 1 suspended opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-024", as: "base" }],
          hand: [{ card: CARD_ID, as: "quartz" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim" },
            { card: "BT1-013", as: "survivor" },
            { card: "BT1-085", as: "tamer" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.memory = 5;
    preferred.push(s.perm("victim").topCard.instanceId, s.perm("tamer").topCard.instanceId);
    const victimInstanceId = s.inst("victim").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quartz").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(
      () =>
        s.perm("base").topCard.cardId === CARD_ID &&
        !s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === victimInstanceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("survivor").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("survivor").instanceId, s.inst("tamer").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5074 raises an orderTriggers decision for the two simultaneous [When Digivolving] effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-024", as: "base" }],
          hand: [{ card: CARD_ID, as: "quartz" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], deck: ["BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quartz").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderTriggers"));

    const ordering = s.decisions.find(({ req }) => req.kind === "orderTriggers");
    expect(ordering, "Q5074 needs a player-facing order choice").toBeDefined();
    expect(ordering!.seat).toBe(0);
    expect(ordering!.req.options?.triggerKeys?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("[Once Per Turn] is shared: the digivolve use blocks the same turn's attack use, and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-024", as: "base" }],
          hand: [{ card: CARD_ID, as: "quartz" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-013", as: "second" },
            { card: "BT1-014", as: "third" },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quartz").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(
      () => s.perm("base").topCard.cardId === CARD_ID && s.state.players[1]!.battleArea.length === 2,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    const survivorsAfterDigivolve = s.state.players[1]!.battleArea.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(survivorsAfterDigivolve);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[1]!.battleArea.every((p) => p.isSuspended)).toBe(true);
    expect(s.perm("base").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.players[1]!.battleArea.length === survivorsAfterDigivolve - 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(survivorsAfterDigivolve - 1);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[All Turns] Q5075: no other Digimon or Tamer unsuspends in either player's unsuspend phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "quartz", suspended: true },
          { card: "BT1-009", as: "mine", suspended: true },
          { card: "BT1-085", as: "myTamer", suspended: true },
        ],
        hand: ["BT1-013"],
        deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
        security: ["BT1-009", "BT1-013"],
      },
      1: {
        battleArea: [
          { card: "BT1-013", as: "theirs", suspended: true },
          { card: "BT1-085", as: "theirTamer", suspended: true },
          { card: "AD1-013", as: "reboot", suspended: true },
        ],
        hand: ["BT1-013"],
        deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
        security: ["BT1-009", "BT1-013"],
      },
    });
    const lockedAliases = ["mine", "myTamer", "theirs", "theirTamer", "reboot"];
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("quartz").isSuspended).toBe(false);
    expect(lockedAliases.map((alias) => [alias, s.perm(alias).isSuspended])).toEqual(
      lockedAliases.map((alias) => [alias, true]),
    );

    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(lockedAliases.map((alias) => [alias, s.perm(alias).isSuspended])).toEqual(
      lockedAliases.map((alias) => [alias, true]),
    );
    expect(s.perm("quartz").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[All Turns] control: without Quartzmon the same board unsuspends normally", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "mine", suspended: true },
          { card: "BT1-085", as: "myTamer", suspended: true },
        ],
        hand: ["BT1-013"],
        deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
        security: ["BT1-009", "BT1-013"],
      },
      1: {
        battleArea: [{ card: "AD1-013", as: "reboot", suspended: true }],
        hand: ["BT1-013"],
        deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
        security: ["BT1-009", "BT1-013"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("mine").isSuspended).toBe(false);
    expect(s.perm("myTamer").isSuspended).toBe(false);
    expect(s.perm("reboot").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[All Turns] leaves effect-driven unsuspension outside the unsuspend phase alone", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "quartz" }] },
      1: { battleArea: [{ card: "BT1-013", as: "theirs", suspended: true }] },
    });
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("theirs").permanentId]);
    expect(s.perm("theirs").isSuspended).toBe(false);
  });

  it("[Hand] [Counter] ＜Blast Digivolve＞ digivolves from hand for free in the counter window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-085", as: "bystander" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "AD1-024", as: "base" }],
          hand: [{ card: CARD_ID, as: "quartz" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "counterWindowOpened"));

    const opened = s.events.find(({ kind }) => kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find(({ instanceId }) => instanceId === s.inst("quartz").instanceId);
    expect(eligible, "Quartzmon must be an eligible ＜Blast Digivolve＞ counter").toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.perm("base").topCard.cardId === CARD_ID);

    expect(s.perm("base").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["AD1-024"]);
    expect(s.perm("bystander").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-085"]);
  });

  it("＜Overflow＞ 5 charges Quartzmon's own controller when it leaves the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 20_000 }],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: CARD_ID, as: "quartz", suspended: true }],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("quartz").permanentId },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(memoryBefore + 5);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });
});
