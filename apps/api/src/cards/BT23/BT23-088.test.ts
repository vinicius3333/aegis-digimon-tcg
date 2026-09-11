import { Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, settleAcrossTimers, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-088.js";

/**
 * BT23-088 K (Purple Tamer, cost 3, [CS]).
 *
 * [Start of Your Main Phase] By trashing 1 card with the [Undead], [Dark Animal] or [CS]
 * trait from your hand, gain 1 memory.
 * [End of Your Turn] By deleting this Tamer, 1 of your Digimon may digivolve into a level 5
 * or lower Digimon card with the [Undead] or [Dark Animal] trait in the trash without paying
 * the cost.
 * [Security] Play this card without paying the cost.
 *
 * Fixture cast:
 * - base  BT2-067 DemiDevimon, Lv.3 Purple, no printed effects (no trigger noise).
 * - into  BT23-063 Sangloupmon, Lv.4 Purple [Dark Animal]/[CS], EvoCost Purple Lv.3 = 2.
 * - BT23-066 Matadormon, Lv.5 Purple [Undead], EvoCost Purple Lv.4 — trait-legal, requirement
 *   illegal from a Lv.3 base.
 * - BT23-068 GranDracmon, Lv.6 Purple [Dark Animal] — trait-legal, level-illegal.
 * - BT10-074 Quetzalmon, Lv.4 Purple [Mythical Beast], EvoCost Purple Lv.3 — requirement-legal,
 *   trait-illegal.
 */
const DECK = Array<string>(10).fill("BT1-009");
const SECURITY = ["BT1-010", "BT1-011", "BT1-012"];
/** Memory handed to the incoming turn player when a turn ends with no memory swing. */
const EXPECTED_MEMORY_AFTER_HANDOVER = 3;
/** A card the turn player can always play, so a hand-laid Main phase is not auto-passed. */
const NEUTRAL = "BT1-009";

describe("BT23-088 K", () => {
  it("matches every catalog field and compiles all three printed clauses", () => {
    expect(getCardDefinition("BT23-088")).toMatchObject({
      cardId: "BT23-088",
      set: "BT23",
      nameEn: "K",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["CS"],
      rarity: "U",
      maxCountInDeck: 4,
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    // The catalog stores two non-breaking spaces ("trait from your", "trait in the")
    // where the official card list prints ordinary spaces. Cosmetic, and cards.json is
    // coordinator-owned, so the comparison normalizes them and the report records the defect.
    expect(getCardDefinition("BT23-088")!.effectText!.replace(/\u00a0/g, " ")).toBe(
      "[Start of Your Main Phase] By trashing 1 card with the [Undead], [Dark Animal] or [CS] trait from your hand, gain 1 memory.\n[End of Your Turn] By deleting this Tamer, 1 of your Digimon may digivolve into a level 5 or lower Digimon card with the [Undead] or [Dark Animal] trait in the trash without paying the cost.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual([
      "StartOfYourMainPhase",
      "EndOfYourTurn",
      "Security",
    ]);
  });

  it("compiles the start-main clause as an optional trash cost paying exactly 1 memory", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions).toHaveLength(1);
    expect(effect?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: {
          count: 1,
          filter: {
            zone: "hand",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Undead", "Dark Animal", "CS"], match: "trait" }],
          },
        },
      },
    });
  });

  it("compiles the end-of-turn clause as a self-delete cost funding a free level-5-or-lower trash digivolve", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: false,
      optional: true,
      abortOnDecline: true,
      target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
      cost: { kind: "deleteOwn", target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
    });
    // No `ignoreReqs` flag: "without paying the cost" waives the memory, never the
    // digivolution requirement (comprehensive rules; see the negative tests below).
    const flags = action as unknown as Record<string, unknown>;
    expect(flags.ignoreReqs).toBeUndefined();
    expect(flags.ignoreRequirements).toBeUndefined();
    expect(flags.ignoreDigivolutionRequirements).toBeUndefined();
    expect(flags.into).toMatchObject({
      controllerDefault: "mine",
      kind: ["Digimon"],
      levelComparison: { op: "lte", value: 5 },
      nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }],
    });
    // "1 of your Digimon" is battle-area only (comprehensive rules 3-4-5-3): the target filter
    // carries no `zone`, and the engine's permanent targeting defaults zone-less filters to the
    // battle area. The breeding-area negative below is the behavioral proof.
    expect((flags.target as { filter: { zone?: unknown } }).filter.zone).toBeUndefined();
  });

  it("compiles the security clause as a free self-play", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(effect?.isSecurity).toBe(true);
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
    });
  });

  it("trashes exactly 1 eligible hand card and gains exactly 1 memory when the real main phase opens", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-088", as: "k" }],
          hand: [{ card: "BT23-062", as: "eligible" }, { card: "BT1-014", as: "ineligible" }, NEUTRAL],
          deck: [...DECK],
          security: [...SECURITY],
        },
        1: { hand: [NEUTRAL], deck: [...DECK], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleId = s.inst("eligible").instanceId;
    const ineligibleId = s.inst("ineligible").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // The hand-laid turn opens at 0 memory; the trash cost gains exactly 1.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([eligibleId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(ineligibleId);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the trash cost gains no memory and keeps the hand intact", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-088", as: "k" }],
          hand: [{ card: "BT23-062", as: "eligible" }, NEUTRAL],
          deck: [...DECK],
          security: [...SECURITY],
        },
        1: { hand: [NEUTRAL], deck: [...DECK], security: [...SECURITY] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const eligibleId = s.inst("eligible").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(eligibleId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gains no memory when the hand holds no [Undead]/[Dark Animal]/[CS] card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-088", as: "k" }],
          hand: [{ card: "BT1-014", as: "ineligible" }, NEUTRAL],
          deck: [...DECK],
          security: [...SECURITY],
        },
        1: { hand: [NEUTRAL], deck: [...DECK], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent on the opponent's main phase and fires again on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-088", as: "k" }],
          hand: [{ card: "BT23-062", as: "first" }, { card: "BT23-066", as: "second" }, NEUTRAL],
          deck: [...DECK],
          security: [...SECURITY],
        },
        1: { hand: [NEUTRAL], deck: [...DECK], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([firstId]);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    // The opponent's main phase gives seat 0 no memory gain and trashes nothing of theirs.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([firstId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(secondId);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(secondId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("deletes K at end of turn and digivolves a Digimon into a trash [Dark Animal] free, with the digivolve draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-088", as: "k" },
            { card: "BT2-067", as: "base" },
          ],
          hand: [NEUTRAL],
          trash: [{ card: "BT23-063", as: "sangloupmon" }],
          deck: [...DECK],
          security: [...SECURITY],
        },
        1: { hand: [NEUTRAL], deck: [...DECK], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const kId = s.inst("k").instanceId;
    const baseId = s.inst("base").instanceId;
    const sangloupmonId = s.inst("sangloupmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // K is deleted as the cost; the trash card is now the top of the base's stack.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(kId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(sangloupmonId);
    const evolved = s.perm("base");
    expect(evolved.topCard?.instanceId).toBe(sangloupmonId);
    expect(evolved.stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(evolved.currentDP).toBe(getCardDefinition("BT23-063")!.dp);
    // Free route: the printed Cost 2 is not paid, but the digivolve draw still happens.
    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    // Handover memory only. Sangloupmon's printed Cost 2 was never drained: the declined
    // branch below reaches the same value from the same board.
    expect(s.state.memory).toBe(EXPECTED_MEMORY_AFTER_HANDOVER);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps K on the board when the end-of-turn cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-088", as: "k" },
            { card: "BT2-067", as: "base" },
          ],
          hand: [NEUTRAL],
          trash: [{ card: "BT23-063", as: "sangloupmon" }],
          deck: [...DECK],
          security: [...SECURITY],
        },
        1: { hand: [NEUTRAL], deck: [...DECK], security: [...SECURITY] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const kId = s.inst("k").instanceId;
    const sangloupmonId = s.inst("sangloupmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kId)).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("BT2-067");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(sangloupmonId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    // Control for the accepted branch: the same board reaches the same handover memory, so the
    // accepted digivolve drained no memory.
    expect(s.state.memory).toBe(EXPECTED_MEMORY_AFTER_HANDOVER);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["a level 6 trash card exceeds the level 5 ceiling", "BT23-068"],
    ["a level 5 trash card whose EvoCost the Lv.3 base cannot meet", "BT23-066"],
    ["a requirement-legal trash card without the [Undead]/[Dark Animal] trait", "BT10-074"],
  ])("does not delete K when the only candidate is %s", async (_why, trashCardId) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-088", as: "k" },
            { card: "BT2-067", as: "base" },
          ],
          hand: [NEUTRAL],
          trash: [{ card: trashCardId, as: "candidate" }],
          deck: [...DECK],
          security: [...SECURITY],
        },
        1: { hand: [NEUTRAL], deck: [...DECK], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const kId = s.inst("k").instanceId;
    const candidateId = s.inst("candidate").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const deckBefore = s.state.players[0]!.deck.length;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kId)).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("BT2-067");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(candidateId);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not reach a breeding-area Digimon, so K survives with no battle-area Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-088", as: "k" }],
          breeding: { card: "BT2-067", as: "hatchling" },
          hand: [NEUTRAL],
          trash: [{ card: "BT23-063", as: "sangloupmon" }],
          deck: [...DECK],
          security: [...SECURITY],
        },
        1: { hand: [NEUTRAL], deck: [...DECK], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const kId = s.inst("k").instanceId;
    const sangloupmonId = s.inst("sangloupmon").instanceId;

    const loop = s.engine.startTurnLoop();
    // A breeding resident opens the interactive breeding window; take the "do nothing" action
    // so the turn reaches Main.
    await settleAcrossTimers(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    // Seat 1 has no breeding resident, so its breeding window auto-skips.
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kId)).toBe(true);
    expect(s.perm("hatchling").topCard?.cardId).toBe("BT2-067");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(sangloupmonId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire the end-of-turn clause on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-088", as: "k" },
            { card: "BT2-067", as: "base" },
          ],
          hand: [NEUTRAL],
          trash: [{ card: "BT23-063", as: "sangloupmon" }],
          deck: [...DECK],
          security: [...SECURITY],
        },
        1: { hand: [NEUTRAL], deck: [...DECK], security: [...SECURITY] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const kId = s.inst("k").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kId)).toBe(true);

    // The opponent ending THEIR turn must not delete K or evolve seat 0's Digimon.
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kId)).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("BT2-067");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Security] plays K into the battle area without paying its 3 cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: { security: [{ card: "BT23-088", as: "k" }], hand: [NEUTRAL], deck: [...DECK] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const kId = s.inst("k").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kId));
    await s.ready();

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(kId);
    // The security play costs nothing: only the attacker's own turn memory stands.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
