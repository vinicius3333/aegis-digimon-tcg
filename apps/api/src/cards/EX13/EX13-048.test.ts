import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import "./EX13-048.js";
import { compiled } from "./EX13-048.js";

const cardId = "EX13-048";

// Reference fixtures for the two different [Knightmon] readings.
//   ST15-09  "Knightmon"       — the exact token in the NAME, so it matches both readings.
//   BT7-058  "SkullKnightmon"  — SUBSTRING in the name, the reason the name slot is
//                                `match: "name"` rather than `nameExact`. Its only printed
//                                effect is [When Attacking], inert in these fixtures.
//   BT18-058 "Kotemon"         — the discriminating near-match: it prints "[Knightmon]" inside
//                                its own effect TEXT and nowhere in its name, so it matches the
//                                text slot and must be refused by the name slot.
//   BT1-013 / BT1-014          — inert main-deck Digimon carrying no [Knightmon] token at all.
const NAME_EXACT = "ST15-09";
const NAME_SUBSTRING = "BT7-058";
const TEXT_ONLY = "BT18-058";
// BT18-062 Gladimon — a SECOND [Knightmon]-in-text-only card. Two of them in one reveal is what
// pins the name slot to `match: "name"`: under a text reading it would take the second card too.
const TEXT_ONLY_2 = "BT18-062";
const NON_MATCH = "BT1-013";
const NON_MATCH_2 = "BT1-014";

// Inert neutral fixtures (main-deck Digimon, no printed effects).
const SENTINEL = "BT1-009";
const NEUTRAL_LV3 = "BT1-013";

const BLACK_EGG = "BT10-005";
const GREEN_EGG = "BT1-007";
// Black Lv.4 whose only printed effect is [On Play] — nothing fires when it digivolves.
const BLACK_LV4 = "BT7-059";

describe("EX13-048 Kotemon", () => {
  it("matches the catalog printed text, stats and evolution cost", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Kotemon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Reptile"],
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      effectText:
        "[On Play] Reveal the top 3 cards of your deck. Add 1 card with [Knightmon] in its text and 1 card with [Knightmon] in its name among them to the hand. Return the rest to the bottom of the deck.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by your effects, by deleting 1 of your other Digimon with [Knightmon] in its text, it doesn't leave.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    // The card prints no [Digivolve] header; the single Black Lv.2 route is a catalog EvoCost.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);

    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay")!;
    expect(onPlay.isInherited).toBeUndefined();
    expect(onPlay.actions).toEqual([
      {
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          {
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] },
            count: 1,
            to: "hand",
          },
          {
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Knightmon"], match: "name" }] },
            count: 1,
            to: "hand",
          },
        ],
        rest: "deckBottom",
      },
    ]);

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
  });

  // ---------------------------------------------------------------------------
  // [On Play] Reveal 3. Add 1 [Knightmon]-in-text card AND 1 [Knightmon]-named card to hand.
  // ---------------------------------------------------------------------------

  it("adds one text match and one name match to hand and bottoms the rest", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "kotemon" }],
          deck: [
            { card: TEXT_ONLY, as: "textMatch" },
            { card: NAME_EXACT, as: "nameMatch" },
            { card: NON_MATCH, as: "miss" },
            { card: SENTINEL, as: "sentinel" },
          ],
          security: [SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL] },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    // The text slot resolves first and the named card matches it too, so steer it to the
    // text-only card; the name slot then has the named card left to take.
    preferred.push(s.inst("textMatch").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("textMatch").instanceId, s.inst("nameMatch").instanceId].sort(),
    );
    // "Return the rest to the bottom of the deck": the non-match sits UNDER the untouched
    // sentinel that was never revealed.
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("miss").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  // The discriminating case for the two readings: BT18-058 Kotemon prints "[Knightmon]" in its
  // effect text but never in its name, so the text slot takes it and the name slot finds nothing.
  it("refuses a text-only match in the name slot, adding just one card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "kotemon" }],
          deck: [
            { card: TEXT_ONLY, as: "textMatch" },
            { card: TEXT_ONLY_2, as: "textMatch2" },
            { card: NON_MATCH, as: "miss" },
            { card: SENTINEL, as: "sentinel" },
          ],
          security: [SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL] },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("textMatch").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length > 0);
    await settle(() => s.state.pendingDecision === undefined);

    // Exactly ONE card reaches the hand: the text slot takes BT18-058, and the name slot refuses
    // the second [Knightmon]-in-text card, which is bottomed with the rest.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("textMatch").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("textMatch2").instanceId,
      s.inst("miss").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  // "in its name" is the SUBSTRING reading: SkullKnightmon carries [Knightmon] inside its name.
  it("accepts a substring name match in the name slot", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "kotemon" }],
          deck: [
            { card: TEXT_ONLY, as: "textMatch" },
            { card: NAME_SUBSTRING, as: "substringMatch" },
            { card: NON_MATCH, as: "miss" },
            { card: SENTINEL, as: "sentinel" },
          ],
          security: [SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL] },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("textMatch").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("textMatch").instanceId, s.inst("substringMatch").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("miss").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("returns all three revealed cards when none carries the [Knightmon] token", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "kotemon" }],
          deck: [
            { card: NON_MATCH, as: "miss" },
            { card: NON_MATCH_2, as: "miss2" },
            { card: SENTINEL, as: "miss3" },
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

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("miss").instanceId,
      s.inst("miss2").instanceId,
      s.inst("miss3").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // Printed EvoCost: Black Lv.2 cost 0.
  // ---------------------------------------------------------------------------

  it("digivolves from a black Lv.2 egg for 0 and refuses a green egg", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: BLACK_EGG, as: "egg" },
        hand: [{ card: cardId, as: "kotemon" }],
        deck: [{ card: SENTINEL, as: "bonusDraw" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("kotemon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === cardId);

    expect(s.state.memory).toBe(0);
    // Source identity: the egg survives as the single digivolution card beneath Kotemon.
    expect(s.perm("egg").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("egg").instanceId]);
    // Digivolution's bonus draw moved the one deck card into hand.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);

    const illegal = setupEngine({
      0: {
        breeding: { card: GREEN_EGG, as: "egg" },
        hand: [{ card: cardId, as: "kotemon" }],
        deck: [SENTINEL],
      },
    });
    illegal.state.memory = 0;
    await illegal.ready();

    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("egg").permanentId,
        instanceId: illegal.inst("kotemon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.perm("egg").topCard.cardId).toBe(GREEN_EGG);
    expect(illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      illegal.inst("kotemon").instanceId,
    ]);
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] [Once Per Turn] leave prevention.
  // ---------------------------------------------------------------------------

  // The cost reads "in its text", so a Digimon that merely PRINTS "[Knightmon]" in its effect
  // text — never in its name — is a legal payment. This is the wider of the card's two readings.
  it("keeps the host in play against an opponent's effect by deleting a [Knightmon]-in-text Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: TEXT_ONLY, as: "fodder" },
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
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([TEXT_ONLY]);
  });

  it("cannot pay with a Digimon carrying no [Knightmon] token, so the host leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: NON_MATCH_2, as: "bystander" },
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
      s.perm("bystander").permanentId,
    ]);
    // The host and its digivolution card went to the trash; the bystander was never touched.
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id).sort()).toEqual([cardId, NEUTRAL_LV3].sort());
  });

  // "1 of YOUR other Digimon" — the deliberate contrast with EX13-027's bare "1 other Digimon"
  // (encoded `controller: "any"`). An opposing [Knightmon] cannot be spent here.
  it("cannot pay with the opponent's [Knightmon], so the host leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NEUTRAL_LV3, as: "host", under: [cardId] }],
          deck: [SENTINEL, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: NAME_EXACT, as: "opponentKnightmon" }],
          deck: [SENTINEL, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
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
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("opponentKnightmon").permanentId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("refuses to pay with the host itself — the cost says 1 OTHER Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NAME_EXACT, as: "host", under: [cardId] }],
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
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id).sort()).toEqual([cardId, NAME_EXACT].sort());
  });

  it("does NOT prevent a leave caused by the controller's own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: NAME_EXACT, as: "fodder" },
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
            { card: NAME_EXACT, as: "first" },
            { card: NAME_SUBSTRING, as: "second" },
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
    // a second payable [Knightmon] is still standing.
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

  it("does not grant the leave prevention without EX13-048 in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [SENTINEL] },
            { card: NAME_EXACT, as: "fodder" },
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
  // black Lv.2 egg -> EX13-048 -> black Lv.4, with the inherited watcher still live on top.
  it("grants the inherited prevention to a Digimon digivolved onto it, preserving source identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "kotemon", under: [{ card: BLACK_EGG, as: "egg" }] },
            { card: NAME_EXACT, as: "fodder" },
          ],
          hand: [{ card: BLACK_LV4, as: "axemon" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kotemon").permanentId,
        instanceId: s.inst("axemon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kotemon").topCard.cardId === BLACK_LV4);
    await settle(() => s.state.pendingDecision === undefined);

    const hostId = s.perm("kotemon").permanentId;
    // Source identity survives the transition: egg at the bottom, EX13-048 above it.
    expect(s.perm("kotemon").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("egg").instanceId,
      s.inst("kotemon").instanceId,
    ]);
    expect(s.state.memory).toBe(0);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    expect(s.perm("kotemon").topCard.cardId).toBe(BLACK_LV4);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([NAME_EXACT]);
  });
});
