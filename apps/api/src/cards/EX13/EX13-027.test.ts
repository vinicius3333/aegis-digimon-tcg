import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-027.js";

const cardId = "EX13-027";

// Name-reference fixtures for "[Sukamon] or [Etemon] in its name".
//   BT3-063  "Sukamon"         — exact token, and its [On Deletion] is inert while the
//                                controller's deck holds no [Chuumon].
//   BT3-070  "Etemon"          — the second token of the union.
//   BT13-065 "PlatinumSukamon" — SUBSTRING match, the reason the reference is `match: "name"`
//                                rather than `nameExact`.
//   BT11-063 "Geremon"         — the near-match: it prints "[Sukamon]" inside its own effect
//                                TEXT but not in its name, so `match: "name"` must refuse it.
//   BT3-061  "Chuumon"         — plain non-match from the same archetype.
const SUKAMON = "BT3-063";
const ETEMON = "BT3-070";
const PLATINUM_SUKAMON = "BT13-065";
const TEXT_ONLY_SUKAMON = "BT11-063";
const ARCHETYPE_NON_MATCH = "BT3-061";

// Inert neutral fixtures (main-deck Digimon, no printed effects).
const SENTINEL = "BT1-009";
const NEUTRAL_LV3 = "BT1-013";

const YELLOW_EGG = "BT1-005";
const BLACK_EGG = "BT10-005";
const GREEN_EGG = "BT1-007";
const YELLOW_LV4 = "BT3-037";

describe("EX13-027 Chuumon", () => {
  it("matches the catalog printed text, stats and dual evolution costs", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Chuumon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Beast"],
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 0 },
        { color: "Black", level: 2, memoryCost: 0 },
      ],
      effectText:
        "[When Moving] [On Play] Reveal the top 3 cards of your deck. Among them, add 1 card with [Sukamon] or [Etemon] in its name to the hand and trash 1 such card. Return the rest to the bottom of the deck.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by your effects, by deleting 1 other Digimon with [Sukamon] in its name, it doesn't leave.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    // The card prints no [Digivolve] header; both routes are catalog EvoCosts.
    expect(compiled.digivolutionRequirement).toBeUndefined();

    // One sentence under two timings: two non-inherited effects with an identical action list.
    const nameUnion = {
      controllerDefault: "mine",
      nameOrTrait: [{ tokens: ["Sukamon", "Etemon"], match: "name" }],
    };
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.isInherited).toBeUndefined();
      expect(effect.actions).toEqual([
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            { filter: nameUnion, count: 1, to: "hand" },
            { filter: nameUnion, count: 1, to: "trash", requiresMinRevealed: 2 },
          ],
          rest: "deckBottom",
        },
      ]);
    }

    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
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
                controller: "any",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
              },
              count: 1,
            },
          },
        },
      ],
    });
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // [On Play] Reveal 3. Add 1 [Sukamon]/[Etemon]-named card to hand AND trash 1 such card.
  // ---------------------------------------------------------------------------

  it("adds one named card to hand, trashes a second, and bottoms the text-only near-match", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "chuumon" }],
          deck: [
            { card: SUKAMON, as: "toHand" },
            { card: ETEMON, as: "toTrash" },
            { card: TEXT_ONLY_SUKAMON, as: "nearMatch" },
            { card: SENTINEL, as: "sentinel" },
          ],
          security: [SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL] },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("toHand").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chuumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length > 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("toHand").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("toTrash").instanceId]);
    // Geremon prints "[Sukamon]" in its text, never in its name, so it is returned with the rest,
    // underneath the untouched sentinel — proving "bottom of the deck".
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("nearMatch").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("adds a substring match and trashes nothing when only one revealed card is named", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "chuumon" }],
          deck: [
            { card: PLATINUM_SUKAMON, as: "substringMatch" },
            { card: TEXT_ONLY_SUKAMON, as: "nearMatch" },
            { card: ARCHETYPE_NON_MATCH, as: "nonMatch" },
            { card: SENTINEL, as: "sentinel" },
          ],
          security: [SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chuumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === PLATINUM_SUKAMON));
    await settle(() => s.state.pendingDecision === undefined);

    // "PlatinumSukamon" carries [Sukamon] as a substring, so the name reference is not exact.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("substringMatch").instanceId]);
    // The trash slot needs a SECOND match among the revealed cards; with one, nothing is trashed.
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("nearMatch").instanceId,
      s.inst("nonMatch").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("returns all three revealed cards when none carries either name token", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "chuumon" }],
          deck: [
            { card: TEXT_ONLY_SUKAMON, as: "nearMatch" },
            { card: ARCHETYPE_NON_MATCH, as: "nonMatch" },
            { card: "BT1-012", as: "thirdMiss" },
            { card: SENTINEL, as: "sentinel" },
          ],
          security: [SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chuumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("nearMatch").instanceId,
      s.inst("nonMatch").instanceId,
      s.inst("thirdMiss").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [When Moving] — the same clause on the public breeding-move route.
  // ---------------------------------------------------------------------------

  it("fires the same reveal clause when it moves out of breeding", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: cardId, as: "chuumon" },
          hand: [{ card: "BT1-014", as: "spare" }],
          deck: [
            { card: SUKAMON, as: "toHand" },
            { card: ETEMON, as: "toTrash" },
            { card: TEXT_ONLY_SUKAMON, as: "nearMatch" },
            { card: SENTINEL, as: "sentinel" },
          ],
          security: [SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL] },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("toHand").instanceId);
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("chuumon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length > 0);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("spare").instanceId, s.inst("toHand").instanceId]),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("toTrash").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("nearMatch").instanceId,
    ]);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // Printed EvoCosts: Yellow Lv.2 cost 0 and Black Lv.2 cost 0.
  // ---------------------------------------------------------------------------

  it("digivolves from a yellow and from a black Lv.2 egg for 0, and refuses a green egg", async () => {
    for (const egg of [YELLOW_EGG, BLACK_EGG]) {
      const s = setupEngine({
        0: {
          breeding: { card: egg, as: "egg" },
          hand: [{ card: cardId, as: "chuumon" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }],
        },
      });
      s.state.memory = 0;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst("chuumon").instanceId,
          useAlternateCost: false,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("egg").topCard.cardId === cardId);

      expect(s.state.memory).toBe(0);
      // Source identity: the egg survives as the single digivolution card beneath Chuumon.
      expect(s.perm("egg").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("egg").instanceId]);
      // Digivolution's bonus draw moved the one deck card into hand.
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
      expect(s.state.players[0]!.deck).toHaveLength(0);
    }

    const illegal = setupEngine({
      0: {
        breeding: { card: GREEN_EGG, as: "egg" },
        hand: [{ card: cardId, as: "chuumon" }],
        deck: [SENTINEL],
      },
    });
    illegal.state.memory = 0;
    await illegal.ready();

    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("egg").permanentId,
        instanceId: illegal.inst("chuumon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.perm("egg").topCard.cardId).toBe(GREEN_EGG);
    expect(illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      illegal.inst("chuumon").instanceId,
    ]);
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] [Once Per Turn] leave prevention.
  // ---------------------------------------------------------------------------

  it("keeps the host in play against an opponent's effect by deleting your own [Sukamon]-named Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: PLATINUM_SUKAMON, as: "fodder" },
          ],
          deck: [SENTINEL, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    // The substring-named PlatinumSukamon paid the cost.
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([PLATINUM_SUKAMON]);
  });

  it("cannot pay with a [Sukamon]-in-text card or an [Etemon]-named card, so the host leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: TEXT_ONLY_SUKAMON, as: "textOnly" },
            { card: ETEMON, as: "etemon" },
          ],
          deck: [SENTINEL, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("textOnly").permanentId,
      s.perm("etemon").permanentId,
    ]);
    // The host and its digivolution card went to the trash; neither candidate was touched.
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id).sort()).toEqual([cardId, NEUTRAL_LV3].sort());
  });

  it("refuses to pay with the host itself — the cost says 1 OTHER Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PLATINUM_SUKAMON, as: "host", under: [cardId] }],
          deck: [SENTINEL, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id).sort()).toEqual([cardId, PLATINUM_SUKAMON].sort());
  });

  // The printed cost is "1 other Digimon with [Sukamon] in its name" — NOT "1 of your other
  // Digimon" (contrast EX13-048/EX13-052 in this same set), so the cost may be paid from either
  // side of the board. This pins the `controller: "any"` reading already used by the two earlier
  // cards printing this same sentence (BT11-040, BT13-065).
  it("may pay the cost with the opponent's [Sukamon]-named Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NEUTRAL_LV3, as: "host", under: [cardId] }],
          deck: [SENTINEL, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: PLATINUM_SUKAMON, as: "opponentFodder" }],
          deck: [SENTINEL, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toEqual([PLATINUM_SUKAMON]);
  });

  it("does NOT prevent a leave caused by the controller's own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: PLATINUM_SUKAMON, as: "fodder" },
          ],
          deck: [SENTINEL, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    // "other than by your effects": the payable PlatinumSukamon was never touched.
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
            { card: PLATINUM_SUKAMON, as: "first" },
            { card: SUKAMON, as: "second" },
          ],
          deck: Array(10).fill(SENTINEL),
          security: [SENTINEL],
        },
        1: { deck: Array(10).fill(SENTINEL), security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    // Same turn: the once-per-turn budget is spent, so the second leave goes through even though
    // a second [Sukamon]-named Digimon is still standing.
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(hostId);

    // A fresh host, and a real turn in between, restores the budget.
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

  it("does not grant the leave prevention without EX13-027 in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [SENTINEL] },
            { card: PLATINUM_SUKAMON, as: "fodder" },
          ],
          deck: [SENTINEL, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
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
  // yellow Lv.2 egg -> EX13-027 -> yellow Lv.4, with the inherited watcher still live on top.
  it("grants the inherited prevention to a Digimon digivolved onto it, preserving source identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "chuumon", under: [{ card: YELLOW_EGG, as: "egg" }] },
            { card: PLATINUM_SUKAMON, as: "fodder" },
          ],
          hand: [{ card: YELLOW_LV4, as: "turuiemon" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chuumon").permanentId,
        instanceId: s.inst("turuiemon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chuumon").topCard.cardId === YELLOW_LV4);
    await settle(() => s.state.pendingDecision === undefined);

    const hostId = s.perm("chuumon").permanentId;
    // Source identity survives the transition: egg at the bottom, EX13-027 above it.
    expect(s.perm("chuumon").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("egg").instanceId,
      s.inst("chuumon").instanceId,
    ]);
    expect(s.state.memory).toBe(0);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    expect(s.perm("chuumon").topCard.cardId).toBe(YELLOW_LV4);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([PLATINUM_SUKAMON]);
  });
});
