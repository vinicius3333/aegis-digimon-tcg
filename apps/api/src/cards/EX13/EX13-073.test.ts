import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-073.js";
import "../index.js";

const CARD_ID = "EX13-073";
const ADVENTURE_ROOKIE = "ST20-07";
const ADVENTURE_LV5 = "BT21-061";
const ADVENTURE_LV4 = "ST20-08";
const PLAIN_LV5 = "BT1-020";
const ADVENTURE_LV6 = "ST20-11";
const ADVENTURE_TAMER = "ST20-12";

describe("EX13-073 Tai Kamiya & Matt Ishida", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Tai Kamiya & Matt Ishida",
      colors: ["Black", "Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["ADVENTURE"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("compiles every printed clause", () => {
    expect(compiled).toMatchObject({ cardId: CARD_ID, coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(4);

    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
          },
        },
      ],
    });

    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon", "Tamer"],
            nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }],
          },
          actions: [
            {
              kind: "CostGatedBlock",
              optional: true,
              abortOnDecline: true,
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
              actions: [
                { kind: "Draw", controller: "mine", amount: 1 },
                { kind: "Trash", target: { filter: { zone: "hand" }, count: 1 } },
              ],
            },
          ],
        },
      ],
    });
    expect(compiled.effects[1]?.actions[0]).not.toMatchObject({ sourceFilter: { excludeSelf: true } });

    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush" },
          duration: "permanent",
          target: {
            count: "all",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "gte", value: 5 },
              nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }],
            },
          },
        },
        { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "permanent", target: { count: "all" } },
      ],
    });

    expect(compiled.effects[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("gains 1 memory at the start of the main phase only with an [ADVENTURE] Digimon out", async () => {
    const withAdventure = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "tamer" },
          { card: ADVENTURE_LV5, as: "adventure" },
        ],
        deck: ["BT1-010"],
      },
      1: { deck: ["BT1-011"] },
    });
    withAdventure.state.memory = 2;
    await withAdventure.ready();
    await advance(withAdventure.engine).fire(EffectTiming.StartOfYourMainPhase, withAdventure.perm("tamer"));
    await settle();
    expect(withAdventure.state.memory).toBe(3);

    const withoutAdventure = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "tamer" },
          { card: PLAIN_LV5, as: "plain" },
        ],
        deck: ["BT1-010"],
      },
      1: { deck: ["BT1-011"] },
    });
    withoutAdventure.state.memory = 2;
    await withoutAdventure.ready();
    await advance(withoutAdventure.engine).fire(EffectTiming.StartOfYourMainPhase, withoutAdventure.perm("tamer"));
    await settle();
    expect(withoutAdventure.state.memory).toBe(2);
  });

  it("does not count an [ADVENTURE] Digimon in the breeding area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "tamer" }],
        breeding: { card: ADVENTURE_ROOKIE, as: "egg" },
        deck: ["BT1-010"],
      },
      1: { deck: ["BT1-011"] },
    });
    s.state.memory = 2;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("tamer"));
    await settle();

    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe(ADVENTURE_ROOKIE);
    expect(s.state.memory).toBe(2);
  });

  it("does not count the opponent's [ADVENTURE] Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "tamer" }], deck: ["BT1-010"] },
      1: { battleArea: [{ card: ADVENTURE_LV5, as: "theirs" }], deck: ["BT1-011"] },
    });
    s.state.memory = 2;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("tamer"));
    await settle();
    expect(s.state.memory).toBe(2);
  });

  it("suspends to draw 1 and trash 1 when an [ADVENTURE] Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          hand: [
            { card: ADVENTURE_ROOKIE, as: "played" },
            { card: "BT1-010", as: "discard" },
          ],
          deck: [{ card: "BT1-012", as: "drawn" }, "BT1-013"],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").isSuspended);

    expect(s.perm("tamer").isSuspended).toBe(true);
    const handIds = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(handIds).toContain(s.inst("drawn").instanceId);
    expect(handIds).not.toContain(s.inst("discard").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("discard").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("also fires for a played [ADVENTURE] trait Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          hand: [
            { card: ADVENTURE_TAMER, as: "played" },
            { card: "BT1-010", as: "discard" },
          ],
          deck: [{ card: "BT1-012", as: "drawn" }, "BT1-013"],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").isSuspended);

    expect(s.perm("tamer").isSuspended).toBe(true);
    const handIds = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(handIds).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("discard").instanceId]);
  });

  it("cannot pay the suspension cost when this Tamer is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer", suspended: true }],
          hand: [
            { card: ADVENTURE_ROOKIE, as: "played" },
            { card: "BT1-010", as: "kept" },
          ],
          deck: [{ card: "BT1-012", as: "undrawn" }, "BT1-013"],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire on the opponent's turn for a play made by an effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "tamer" }],
        hand: [
          { card: ADVENTURE_ROOKIE, as: "played" },
          { card: "BT1-010", as: "kept" },
        ],
        deck: [{ card: "BT1-012", as: "undrawn" }, "BT1-013"],
      },
      1: { deck: ["BT1-011"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("played").instanceId], CARD_ID);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain(ADVENTURE_ROOKIE);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not fire for a played Digimon without the [ADVENTURE] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          hand: [
            { card: "BT1-009", as: "played" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: [{ card: "BT1-012", as: "undrawn" }, "BT1-013"],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("leaves hand and deck untouched when the suspension cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          hand: [
            { card: ADVENTURE_ROOKIE, as: "played" },
            { card: "BT1-010", as: "kept" },
          ],
          deck: [{ card: "BT1-012", as: "undrawn" }, "BT1-013"],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("grants Rush and Blocker to level 5+ [ADVENTURE] Digimon only", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "tamer" },
          { card: ADVENTURE_LV5, as: "big" },
          { card: ADVENTURE_LV6, as: "mega" },
          { card: ADVENTURE_LV4, as: "small" },
          { card: PLAIN_LV5, as: "plain" },
          { card: PLAIN_LV5, as: "stacked", under: [ADVENTURE_LV4] },
        ],
        deck: ["BT1-010"],
      },
      1: { battleArea: [{ card: ADVENTURE_LV5, as: "theirs" }], deck: ["BT1-011"] },
    });
    await s.ready();
    await advance(s.engine).recompute();

    for (const keyword of ["Rush", "Blocker"]) {
      expect(observe(s.engine).hasKeyword(s.perm("big"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("mega"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("small"), keyword)).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm("plain"), keyword)).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm("stacked"), keyword)).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm("theirs"), keyword)).toBe(false);
    }
  });

  it("gives a freshly played level 6 [ADVENTURE] Digimon a legal attack the same turn", async () => {
    const withTamer = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          hand: [
            { card: ADVENTURE_LV6, as: "rusher" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-012", "BT1-013"],
          security: ["BT1-014"],
        },
        1: { security: ["BT1-013"], deck: ["BT1-011"] },
      },
      { autoDeclineOptional: true },
    );
    withTamer.state.memory = 9;
    await withTamer.ready();

    expect(
      withTamer.engine.applyIntent(0, { type: "playCard", instanceId: withTamer.inst("rusher").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => withTamer.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === ADVENTURE_LV6));
    const rusher = withTamer.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === ADVENTURE_LV6)!;
    expect(observe(withTamer.engine).hasKeyword(rusher, "Rush")).toBe(true);
    expect(
      withTamer.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: rusher.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    const without = setupEngine(
      {
        0: {
          hand: [
            { card: ADVENTURE_LV6, as: "rusher" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-012", "BT1-013"],
          security: ["BT1-014"],
        },
        1: { security: ["BT1-013"], deck: ["BT1-011"] },
      },
      { autoDeclineOptional: true },
    );
    without.state.memory = 9;
    await without.ready();
    expect(without.engine.applyIntent(0, { type: "playCard", instanceId: without.inst("rusher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => without.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === ADVENTURE_LV6));
    const slow = without.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === ADVENTURE_LV6)!;
    expect(observe(without.engine).hasKeyword(slow, "Rush")).toBe(false);
    expect(
      without.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: slow.permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("lets the granted ＜Blocker＞ make a real block on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "tamer" },
          { card: ADVENTURE_LV5, as: "big" },
        ],
        deck: ["BT1-010"],
        security: ["BT1-014"],
      },
      1: { battleArea: [{ card: "BT1-019", as: "attacker", dp: 3000 }], deck: ["BT1-011"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("big").permanentId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("BT1-019");
  });

  it("refuses a block from the level 4 [ADVENTURE] Digimon the grant skips", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "tamer" },
          { card: ADVENTURE_LV4, as: "small" },
        ],
        deck: ["BT1-010"],
        security: ["BT1-014"],
      },
      1: { battleArea: [{ card: "BT1-019", as: "attacker", dp: 3000 }], deck: ["BT1-011"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("small").permanentId }).ok).toBe(
      false,
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("drops both grants as soon as this Tamer leaves the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "tamer" },
          { card: ADVENTURE_LV5, as: "big", enteredThisTurn: true },
        ],
        deck: ["BT1-010"],
        security: ["BT1-014"],
      },
      1: { security: ["BT1-013"], deck: ["BT1-011"] },
    });
    await s.ready();
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("big"), "Rush")).toBe(true);

    const removed = await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId]);
    expect(removed).toBe(1);
    await settle();

    expect(observe(s.engine).hasKeyword(s.perm("big"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("big"), "Blocker")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("big").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("plays itself from security through a real public attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "attacker", dp: 20000 }], deck: ["BT1-010"] },
      1: { security: [{ card: CARD_ID, as: "securityTamer" }], deck: ["BT1-011"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain(CARD_ID);
  });

  it("gains exactly 1 memory through the production turn loop and only with an [ADVENTURE] Digimon", async () => {
    async function memoryAtMainPhase(boardDigimon: string): Promise<number> {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: CARD_ID, as: "tamer" },
              { card: boardDigimon, as: "board" },
            ],
            deck: ["BT1-010", "BT1-012", "BT1-013"],
          },
          1: { deck: ["BT1-011", "BT1-014"] },
        },
        { autoDeclineOptional: true },
      );
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      const memory = s.state.memory;
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
      return memory;
    }

    expect(await memoryAtMainPhase(ADVENTURE_LV5)).toBe((await memoryAtMainPhase(PLAIN_LV5)) + 1);
  });

  it("unsuspends through the turn loop so the watcher can pay its cost again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tamer", suspended: true },
            { card: ADVENTURE_LV5, as: "adventure" },
          ],
          hand: [
            { card: ADVENTURE_ROOKIE, as: "played" },
            { card: "BT1-010", as: "discard" },
          ],
          deck: [{ card: "BT1-012", as: "drawn" }, "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("tamer").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").isSuspended);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("discard").instanceId]);

    // The attack BT21-061 granted owns the board until it ends; the turn cannot be passed
    // out from under it.
    await advance(s.engine).finishAttack();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
