import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-073.js";
import "../index.js";

const CARD_ID = "EX13-073";
// ST20-07 Tentomon: Lv.3 [ADVENTURE], play cost 3, and its only printed clause is an
// [Opponent's Turn] static — nothing that competes with the watcher under test.
const ADVENTURE_ROOKIE = "ST20-07";
// BT21-061 MetalGreymon: Lv.5 [ADVENTURE]. ST20-08 Kabuterimon: Lv.4 [ADVENTURE] (below the
// printed floor). BT1-020: Lv.5 with no [ADVENTURE] trait and no printed text.
const ADVENTURE_LV5 = "BT21-061";
const ADVENTURE_LV4 = "ST20-08";
const PLAIN_LV5 = "BT1-020";

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
    // The printed sentence has no "other than this Tamer", so the watcher must not exclude itself.
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
          { card: ADVENTURE_LV4, as: "small" },
          { card: PLAIN_LV5, as: "plain" },
        ],
        deck: ["BT1-010"],
      },
      1: { deck: ["BT1-011"] },
    });
    await s.ready();
    await advance(s.engine).recompute();

    for (const keyword of ["Rush", "Blocker"]) {
      expect(observe(s.engine).hasKeyword(s.perm("big"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("small"), keyword)).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm("plain"), keyword)).toBe(false);
    }
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

  it("gains the memory through a real turn transition and resets its suspension next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tamer", suspended: true },
            { card: ADVENTURE_LV5, as: "adventure" },
          ],
          deck: ["BT1-010", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-014"] },
      },
      { autoAcceptOptional: false, autoDeclineOptional: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    // The unsuspend phase readies the Tamer and the printed main-phase clause then pays out.
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.memory).toBeGreaterThanOrEqual(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
