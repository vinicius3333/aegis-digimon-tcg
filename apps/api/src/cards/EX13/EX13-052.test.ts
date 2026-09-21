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

const SENTINEL = "BT1-009";
const NEUTRAL_LV3 = "BT1-013";
const NEUTRAL_LV4 = "BT1-014";

const BLACK_LV3 = "BT2-052";
const RED_LV3 = "BT1-013";

const KNIGHTMON_NAME = "ST15-09";
const KNIGHTMON_NAME_SUBSTRING = "BT7-058";
const KNIGHTMON_TEXT_ONLY = "BT18-058";

const OPPONENT_TOP = "BT3-067";
const OPPONENT_MID = "BT4-069";
const OPPONENT_BOTTOM = "BT1-010";

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
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
    expect(compiled.effects).toHaveLength(4);

    expect(compiled.effects[0]).toEqual({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Guard", raw: "＜Guard＞" }],
    });

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

    expect(compiled.effects.some((effect) => effect.trigger === "AllTurns" && effect.isInherited !== true)).toBe(false);

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

    expect(s.perm("victim").topCard.cardId).toBe(OPPONENT_MID);
    expect(s.perm("victim").stack.map(({ cardId: id }) => id)).toEqual([OPPONENT_BOTTOM]);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toEqual([OPPONENT_TOP]);
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

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId).sort()).toEqual([allyA, allyB].sort());
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q7374: both Guard copies resolve after the first prevents the leave, then both On Deletion effects fire", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "firstGuard" },
            { card: cardId, as: "secondGuard" },
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
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([allyId]);
    expect(s.state.players[0]!.trash.filter(({ cardId: id }) => id === cardId)).toHaveLength(2);
    expect(s.perm("victim").topCard.cardId).toBe(OPPONENT_BOTTOM);
    expect(s.perm("victim").stack).toHaveLength(0);
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

  it("Q7373: keeps the host in play by deleting a text-only [Knightmon] Digimon", async () => {
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

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(hostId);

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
