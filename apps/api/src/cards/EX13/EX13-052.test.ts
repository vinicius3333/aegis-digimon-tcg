import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import "./EX13-052.js";
import { compiled } from "./EX13-052.js";

const cardId = "EX13-052";

// Inert neutral fixtures (main-deck Digimon with no printed effects at all).
const SENTINEL = "BT1-009"; // Red Lv.3 Monodramon, 3000 DP.
const NEUTRAL_LV3 = "BT1-013"; // Red Lv.3 Muchomon, 5000 DP.
const NEUTRAL_LV4 = "BT1-014"; // Red Lv.4 Kokatorimon, 4000 DP.

// Evolution fixtures for the single printed EvoCost (Black Lv.3 for 2).
const BLACK_LV3 = "BT2-052"; // Hagurumon — Black Lv.3, no printed effects.
const RED_LV3 = "BT1-013"; // off-color Lv.3, the illegal source.

// [Knightmon]-in-text fixtures for the inherited cost, the same trio EX13-048 uses:
//   ST15-09  Knightmon      — the token in the NAME, the plain positive.
//   BT7-058  SkullKnightmon — SUBSTRING in the name; its only effect is [When Attacking], inert.
//   BT18-058 Kotemon        — prints "[Knightmon]" only inside its effect TEXT, never in its
//                             name: the discriminating positive for `match: "text"`.
//   BT1-013 / BT1-014       — carry no [Knightmon] token anywhere: the negatives.
const KNIGHTMON_NAME = "ST15-09";
const KNIGHTMON_NAME_SUBSTRING = "BT7-058";
const KNIGHTMON_TEXT_ONLY = "BT18-058";

// A 2-deep opponent stack whose upper source card is itself level 4. That is what pins the
// printed "1": exactly the top card is trashed and the level-4 card is promoted. With
// `amount: 2` the promoted BT4-069 would be peeled too (`peelStackTops` only stops its repeat
// once a level-3 card is on top).
const OPPONENT_TOP = "BT3-067"; // Tankmon, Lv.4.
const OPPONENT_MID = "BT4-069"; // level-4 source card, the promoted survivor.
const OPPONENT_BOTTOM = "BT1-010"; // level-3 source card at the bottom.

const inertDeck = [SENTINEL, SENTINEL, SENTINEL, SENTINEL, SENTINEL];

describe("EX13-052 Gladimon", () => {
  it("matches the catalog printed text, stats and evolution cost", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "EX13",
      nameEn: "Gladimon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Warrior"],
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      effectText: "＜Guard＞ \n[On Play] [On Deletion] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. ",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by your effects, by deleting 1 of your other Digimon with [Knightmon] in its text, it doesn't leave.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    // No printed [Digivolve] header: the single Black Lv.3 route is the catalog EvoCost.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
    expect(compiled.effects).toHaveLength(5);

    expect(compiled.effects[0]).toEqual({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Guard", raw: "＜Guard＞" }],
    });

    // One printed sentence under two timings, no [Once Per Turn] gate on either.
    for (const trigger of ["OnPlay", "OnDeletion"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.frequency).toBeUndefined();
      expect(effect.sharedUseKey).toBeUndefined();
      expect(effect.isInherited).toBeUndefined();
      expect(effect.actions).toMatchObject([
        {
          kind: "DeDigivolve",
          amount: 1,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ]);
    }

    const guard = compiled.effects.find((effect) => effect.trigger === "AllTurns" && effect.isInherited !== true)!;
    expect(guard).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byOpponentEffect",
          affectsAll: true,
          target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: "all" },
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          cost: {
            kind: "deleteOwn",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        },
      ],
    });
    expect(guard.frequency).toBeUndefined();

    const inherited = compiled.effects.find((effect) => effect.isInherited === true)!;
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
              },
              count: 1,
            },
          },
        },
      ],
    });
    expect(inherited.actions[0]).not.toHaveProperty("oncePerTurnKey");
  });

  // ---------------------------------------------------------------------------
  // [On Play] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.
  // ---------------------------------------------------------------------------

  it("plays for 4 memory and de-digivolves exactly one card off the opponent's stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "gladimon" }],
          battleArea: [{ card: OPPONENT_TOP, as: "ownStack", under: [SENTINEL] }],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: OPPONENT_TOP, as: "victim", under: [OPPONENT_BOTTOM, OPPONENT_MID] }],
          deck: inertDeck,
          security: [SENTINEL],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gladimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 1);
    await settle();

    // Exactly the top card left the opponent's stack; the level-4 source is the new top.
    expect(s.perm("victim").topCard.cardId).toBe(OPPONENT_MID);
    expect(s.perm("victim").stack.map(({ cardId: id }) => id)).toEqual([OPPONENT_BOTTOM]);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toEqual([OPPONENT_TOP]);
    // "your opponent's Digimon": the controller's own stack is untouched.
    expect(s.perm("ownStack").topCard.cardId).toBe(OPPONENT_TOP);
    expect(s.perm("ownStack").stack.map(({ cardId: id }) => id)).toEqual([SENTINEL]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      [cardId, OPPONENT_TOP].sort(),
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does nothing on play when the opponent has no Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: cardId, as: "gladimon" }], deck: inertDeck, security: [SENTINEL] },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gladimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does not fire the [On Play] clause when it digivolves instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV3, as: "host" }],
          hand: [{ card: cardId, as: "gladimon" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, ...inertDeck],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: OPPONENT_TOP, as: "victim", under: [OPPONENT_BOTTOM, OPPONENT_MID] }],
          deck: inertDeck,
          security: [SENTINEL],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("gladimon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === cardId);
    await settle();

    // Printed EvoCost Black Lv.3 for 2, source identity kept, one bonus draw, and no
    // De-Digivolve: the card prints no [When Digivolving] timing.
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.map(({ cardId: id }) => id)).toEqual([BLACK_LV3]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.perm("victim").topCard.cardId).toBe(OPPONENT_TOP);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("refuses an off-color Lv.3 source for the printed Black Lv.3 route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: RED_LV3, as: "host" }],
        hand: [{ card: cardId, as: "gladimon" }],
        deck: inertDeck,
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("gladimon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.perm("host").topCard.cardId).toBe(RED_LV3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("gladimon").instanceId]);
    expect(s.state.memory).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.
  // ---------------------------------------------------------------------------

  it("de-digivolves one card off the opponent's stack when Gladimon itself is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "gladimon" }],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: OPPONENT_TOP, as: "victim", under: [OPPONENT_BOTTOM, OPPONENT_MID] }],
          deck: inertDeck,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    // Gladimon is the only Digimon the controller has, so ＜Guard＞ (which protects only OTHER
    // Digimon) offers nothing: the deletion goes through and the [On Deletion] clause fires.
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("gladimon").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[1]!.trash.length === 1);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
    expect(s.perm("victim").topCard.cardId).toBe(OPPONENT_MID);
    expect(s.perm("victim").stack.map(({ cardId: id }) => id)).toEqual([OPPONENT_BOTTOM]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // ＜Guard＞ — §16-45: when any of your OTHER Digimon would leave by an opponent's effect,
  // by deleting this Digimon, they don't leave.
  // ---------------------------------------------------------------------------

  it("exposes the printed ＜Guard＞ keyword on the continuous ledger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "gladimon" }], deck: inertDeck } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("gladimon"), "Guard")).toBe(true);
  });

  it("saves another of your Digimon from an opponent's effect by deleting itself, then de-digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gladimon" },
            { card: NEUTRAL_LV4, as: "ally" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: OPPONENT_TOP, as: "victim", under: [OPPONENT_BOTTOM, OPPONENT_MID] }],
          deck: inertDeck,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[1]!.trash.length === 1);
    await settle();

    // The ally stayed; Gladimon paid with itself; and its own [On Deletion] then fired.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([allyId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
    expect(s.perm("victim").topCard.cardId).toBe(OPPONENT_MID);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toEqual([OPPONENT_TOP]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("saves every matching Digimon in one leave event for a single payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gladimon" },
            { card: NEUTRAL_LV4, as: "allyA" },
            { card: NEUTRAL_LV3, as: "allyB" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const allyA = s.perm("allyA").permanentId;
    const allyB = s.perm("allyB").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([allyA, allyB], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.trash.length === 1);
    await settle();

    // "they don't leave": one Gladimon paid for BOTH.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId).sort()).toEqual([allyA, allyB].sort());
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not offer ＜Guard＞ against the controller's own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gladimon" },
            { card: NEUTRAL_LV4, as: "ally" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    // "by an opponent's effect": the controller's own deletion is not replaced, and Gladimon
    // was never spent.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([NEUTRAL_LV4]);
  });

  it("does not save Gladimon itself — ＜Guard＞ protects OTHER Digimon only", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gladimon" },
            { card: NEUTRAL_LV4, as: "ally" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("gladimon").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([allyId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
  });

  // ---------------------------------------------------------------------------
  // [Inherited] [All Turns] [Once Per Turn] leave prevention paid with a
  // [Knightmon]-in-text Digimon.
  // ---------------------------------------------------------------------------

  it("keeps the host in play by deleting a [Knightmon]-in-text Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: KNIGHTMON_TEXT_ONLY, as: "fodder" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    // BT18-058 prints "[Knightmon]" only inside its effect text, so `match: "text"` — not a
    // name reading — is what makes it a legal payment.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([KNIGHTMON_TEXT_ONLY]);
  });

  it("accepts a substring [Knightmon] name as the payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: KNIGHTMON_NAME_SUBSTRING, as: "fodder" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([KNIGHTMON_NAME_SUBSTRING]);
  });

  it("cannot pay with a Digimon carrying no [Knightmon] token, so the host leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: NEUTRAL_LV4, as: "bystander" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("bystander").permanentId,
    ]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id).sort()).toEqual([cardId, NEUTRAL_LV3].sort());
  });

  it("cannot pay with the opponent's [Knightmon] — the cost says 1 of YOUR Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NEUTRAL_LV3, as: "host", under: [cardId] }],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: KNIGHTMON_NAME, as: "opponentKnightmon" }],
          deck: inertDeck,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("opponentKnightmon").permanentId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("refuses to pay with the host itself — the cost says 1 OTHER Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KNIGHTMON_NAME, as: "host", under: [cardId] }],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id).sort()).toEqual([cardId, KNIGHTMON_NAME].sort());
  });

  it("does NOT prevent a leave caused by the controller's own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: KNIGHTMON_NAME, as: "fodder" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    // "other than by your effects": the payable Knightmon was never touched.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("fodder").permanentId,
    ]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id).sort()).toEqual([cardId, NEUTRAL_LV3].sort());
  });

  it("prevents only ONE leave per turn and reopens after a real turn passes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: KNIGHTMON_NAME, as: "first" },
            { card: KNIGHTMON_NAME_SUBSTRING, as: "second" },
          ],
          deck: Array(10).fill(SENTINEL),
          security: [SENTINEL],
        },
        1: { deck: Array(10).fill(SENTINEL), security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    // Same turn: the budget is spent, so the second leave resolves even though a second
    // payable [Knightmon] is still standing.
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(hostId);

    // A fresh host and a real turn in between restore the budget.
    const revived = s.putOnBoard(0, { card: NEUTRAL_LV3, as: "host2", under: [cardId] });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([revived.permanentId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(revived.permanentId);
  });

  it("does not grant the leave prevention without EX13-052 in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [SENTINEL] },
            { card: KNIGHTMON_NAME, as: "fodder" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("fodder").permanentId,
    ]);
  });

  // Smallest legal stack that reaches the inherited clause through a real digivolution:
  // Black Lv.3 -> EX13-052 -> Black Lv.5, with the inherited watcher live on the new top card.
  it("grants the inherited prevention to a Digimon digivolved onto it, preserving source identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gladimon", under: [{ card: BLACK_LV3, as: "base" }] },
            { card: KNIGHTMON_TEXT_ONLY, as: "fodder" },
          ],
          hand: [{ card: KNIGHTMON_NAME, as: "knightmon" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, ...inertDeck],
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gladimon").permanentId,
        instanceId: s.inst("knightmon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gladimon").topCard.cardId === KNIGHTMON_NAME);
    await settle();

    const hostId = s.perm("gladimon").permanentId;
    // Source identity survives: the Black Lv.3 at the bottom, Gladimon above it.
    expect(s.perm("gladimon").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("base").instanceId,
      s.inst("gladimon").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    expect(s.perm("gladimon").topCard.cardId).toBe(KNIGHTMON_NAME);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([KNIGHTMON_TEXT_ONLY]);
  });
});
