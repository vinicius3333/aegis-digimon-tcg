import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-028.js";

const cardId = "EX13-028";

// Fixtures for "1 play cost 3 or lower Digimon card with [Chuumon] or [Sukamon] in its name".
//   BT11-036 "Chuumon"         — exact token, play cost 3: the legal free play. Its own printed
//                                effect is a digivolve-cost watcher, inert while it just sits.
//   BT13-065 "PlatinumSukamon" — SUBSTRING match, play cost 3: the reason the reference is
//                                `match: "name"` rather than `nameExact`.
//   BT11-043 "KingSukamon"     — carries the name token but costs 7, so `playCostLte: 3` refuses
//                                it.
//   BT11-063 "Geremon"         — near-match: it prints "[Sukamon]" inside its own effect TEXT,
//                                never in its name, so `match: "name"` must refuse it.
//   BT1-012  "Biyomon"         — plain non-match, play cost 3 and inert.
const CHUUMON = "BT11-036";
const PLATINUM_SUKAMON = "BT13-065";
const OVERCOST_SUKAMON = "BT11-043";
const TEXT_ONLY_SUKAMON = "BT11-063";
const NON_MATCH = "BT1-012";

// Inert neutral fixtures (main-deck Digimon, no printed effects of any kind).
const SENTINEL = "BT1-009";
const NEUTRAL_LV3 = "BT1-013";

// Single-colour, fully inert Lv.3 digivolution sources for the two printed EvoCosts.
const YELLOW_LV3 = "BT1-050";
const BLACK_LV3 = "BT3-060";
const GREEN_LV3 = "BT1-064";
// Inert yellow Lv.5 whose only printed EvoCost is Yellow Lv.4 for 2 — the legal next step up.
const YELLOW_LV5 = "BT1-057";

const DECK = [SENTINEL, SENTINEL, SENTINEL];

describe("EX13-028 Sukamon", () => {
  it("matches the catalog printed text, stats and dual evolution costs", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Sukamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 3,
      dp: 2000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Abnormal"],
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 2 },
        { color: "Black", level: 3, memoryCost: 2 },
      ],
      effectText:
        "＜Blocker＞ \n[On Deletion] Reveal the top 3 cards of your deck. You may play 1 play cost 3 or lower Digimon card with [Chuumon] or [Sukamon] in its name among them without paying the cost. trash the rest.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by your effects, by deleting 1 other Digimon with [Sukamon] in its name, it doesn't leave.",
    });
    expect(getCardDefinition(cardId)?.securityEffectText ?? "").toBe("");
  });

  it("compiles the keyword, the [On Deletion] reveal and the inherited leave prevention", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    // The card prints no [Digivolve] header; both routes are catalog EvoCosts.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.assemblyRequirement).toBeUndefined();
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);

    expect(compiled.effects.find(({ trigger }) => trigger === "Static")).toMatchObject({
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });

    const onDeletion = compiled.effects.find(({ trigger }) => trigger === "OnDeletion")!;
    expect(onDeletion.isInherited).toBeUndefined();
    expect(onDeletion.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              playCostLte: 3,
              nameOrTrait: [{ tokens: ["Chuumon", "Sukamon"], match: "name" }],
            },
            count: 1,
            to: "play",
            optional: true,
          },
        ],
        rest: "trash",
      },
    ]);
    // "without paying the cost" is the full waiver, not a reduction.
    expect((onDeletion.actions[0] as { add: { costDelta?: number }[] }).add[0]!.costDelta).toBeUndefined();

    const inherited = compiled.effects.find(({ isInherited }) => isInherited)!;
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
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] Reveal 3; you may free-play 1 play-cost-3-or-lower [Chuumon]/[Sukamon]-named
  // Digimon card among them; trash the rest.
  // ---------------------------------------------------------------------------

  it("free-plays the revealed [Chuumon] and trashes the other two revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "sukamon" }],
          deck: [
            { card: CHUUMON, as: "freePlay" },
            { card: TEXT_ONLY_SUKAMON, as: "nearMatch" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();
    const sukamonId = s.perm("sukamon").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([sukamonId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CHUUMON));
    await settle(() => s.state.pendingDecision === undefined);

    // Chuumon entered the battle area in place of the deleted Sukamon.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("freePlay").instanceId,
    ]);
    // "without paying the cost": the play cost 3 was waived, memory did not move.
    expect(s.state.memory).toBe(0);
    // "trash the rest" — the two unchosen revealed cards, plus the deleted Sukamon itself.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("sukamon").instanceId, s.inst("nearMatch").instanceId, s.inst("nonMatch").instanceId].sort(),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    // Only the top 3 were revealed; the fourth card stayed in the deck.
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  it("free-plays a SUBSTRING name match over a near-match that only prints [Sukamon] in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "sukamon" }],
          deck: [
            { card: TEXT_ONLY_SUKAMON, as: "nearMatch" },
            { card: PLATINUM_SUKAMON, as: "freePlay" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("sukamon").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === PLATINUM_SUKAMON));
    await settle(() => s.state.pendingDecision === undefined);

    // "PlatinumSukamon" carries [Sukamon] as a substring, so the reference is not exact; Geremon
    // carries it only inside its printed text, so it was never a candidate.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("freePlay").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("sukamon").instanceId, s.inst("nearMatch").instanceId, s.inst("nonMatch").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  it("refuses an over-cost [Sukamon] card and a text-only near-match, trashing all three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "sukamon" }],
          deck: [
            { card: OVERCOST_SUKAMON, as: "overCost" },
            { card: TEXT_ONLY_SUKAMON, as: "nearMatch" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("sukamon").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.trash.length >= 4);
    await settle(() => s.state.pendingDecision === undefined);

    // KingSukamon's play cost is 7, so `playCostLte: 3` excludes it even though its name matches.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [
        s.inst("sukamon").instanceId,
        s.inst("overCost").instanceId,
        s.inst("nearMatch").instanceId,
        s.inst("nonMatch").instanceId,
      ].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  it("trashes every revealed card when the printed 'You may' is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "sukamon" }],
          deck: [
            { card: CHUUMON, as: "declined" },
            { card: PLATINUM_SUKAMON, as: "alsoDeclined" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("sukamon").permanentId], "byEffect");

    // The printed "You may" reaches the controller as a `selectCards` decision that accepts an
    // empty selection even though two revealed cards qualify, so the deletion stays open until it
    // is answered.
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson) as { candidateInstanceIds?: string[]; min?: number };
    expect([...(payload.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.inst("declined").instanceId, s.inst("alsoDeclined").instanceId].sort(),
    );
    expect(payload.min ?? 0).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [
        s.inst("sukamon").instanceId,
        s.inst("declined").instanceId,
        s.inst("alsoDeclined").instanceId,
        s.inst("nonMatch").instanceId,
      ].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // ＜Blocker＞
  // ---------------------------------------------------------------------------

  it("opens a real block window and intercepts an attack aimed at the player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: NEUTRAL_LV3, as: "attacker" }], deck: DECK, security: [SENTINEL] },
      1: { battleArea: [{ card: cardId, as: "sukamon" }], deck: DECK, security: [SENTINEL] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("sukamon"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.events.find(({ kind }) => kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("sukamon").permanentId],
    });

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("sukamon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
    await settle(() => s.state.pendingDecision === undefined);

    // The block redirected the attack: security is untouched and the 2000 DP blocker lost to the
    // 5000 DP attacker, which also fired its own [On Deletion] reveal.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([NEUTRAL_LV3]);
  });

  // ---------------------------------------------------------------------------
  // Printed EvoCosts: Yellow Lv.3 for 2 and Black Lv.3 for 2.
  // ---------------------------------------------------------------------------

  it("digivolves from a yellow and from a black Lv.3 Digimon for 2, and refuses a green Lv.3", async () => {
    for (const source of [YELLOW_LV3, BLACK_LV3]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: source, as: "source" }],
          hand: [{ card: cardId, as: "sukamon" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      });
      s.state.memory = 2;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: s.inst("sukamon").instanceId,
          useAlternateCost: false,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("source").topCard.cardId === cardId);

      // Printed cost 2 was charged.
      expect(s.state.memory).toBe(0);
      // Source identity: the Lv.3 survives as the single digivolution card beneath Sukamon.
      expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("source").instanceId]);
      // Digivolution's bonus draw moved the one deck card into hand.
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
      expect(s.state.players[0]!.deck).toHaveLength(0);
    }

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: GREEN_LV3, as: "source" }],
        hand: [{ card: cardId, as: "sukamon" }],
        deck: DECK,
        security: [SENTINEL],
      },
      1: { deck: DECK, security: [SENTINEL] },
    });
    illegal.state.memory = 2;
    await illegal.ready();

    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("source").permanentId,
        instanceId: illegal.inst("sukamon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.perm("source").topCard.cardId).toBe(GREEN_LV3);
    expect(illegal.state.memory).toBe(2);
    expect(illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      illegal.inst("sukamon").instanceId,
    ]);
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] [Once Per Turn] leave prevention.
  // ---------------------------------------------------------------------------

  it("keeps the host in play against an opponent's effect by deleting a [Sukamon]-named Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: PLATINUM_SUKAMON, as: "fodder" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
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
    // The substring-named PlatinumSukamon paid the cost; its own [On Deletion] found no opponent
    // Digimon to de-digivolve, so nothing else moved.
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([PLATINUM_SUKAMON]);
  });

  it("cannot pay with a card that carries [Sukamon] only in its text, so the host leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: TEXT_ONLY_SUKAMON, as: "textOnly" },
            { card: CHUUMON, as: "chuumon" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    // Neither Geremon (text only) nor Chuumon (a different name) can pay.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("textOnly").permanentId,
      s.perm("chuumon").permanentId,
    ]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id).sort()).toEqual([cardId, NEUTRAL_LV3].sort());
  });

  it("may pay the cost with the opponent's [Sukamon]-named Digimon — the text says 1 other Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: NEUTRAL_LV3, as: "host", under: [cardId] }], deck: DECK, security: [SENTINEL] },
        1: { battleArea: [{ card: PLATINUM_SUKAMON, as: "fodder" }], deck: DECK, security: [SENTINEL] },
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
          deck: DECK,
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
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
            { card: "BT3-063", as: "second" },
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

    // Same turn: the once-per-turn budget is spent, so the second leave goes through even though a
    // second [Sukamon]-named Digimon is still standing.
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

  it("does not grant the leave prevention without EX13-028 in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [SENTINEL] },
            { card: PLATINUM_SUKAMON, as: "fodder" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
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

  // Smallest legal stack that reaches the inherited clause through a real digivolution: an inert
  // yellow Lv.3 -> EX13-028 -> an inert yellow Lv.5, with the inherited watcher still live on top.
  it("grants the inherited prevention to a Digimon digivolved onto it, preserving source identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "sukamon", under: [{ card: YELLOW_LV3, as: "source" }] },
            { card: PLATINUM_SUKAMON, as: "fodder" },
          ],
          hand: [{ card: YELLOW_LV5, as: "sirenmon" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sukamon").permanentId,
        instanceId: s.inst("sirenmon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sukamon").topCard.cardId === YELLOW_LV5);
    await settle(() => s.state.pendingDecision === undefined);

    const hostId = s.perm("sukamon").permanentId;
    // Source identity survives the transition: the Lv.3 at the bottom, EX13-028 above it.
    expect(s.perm("sukamon").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("source").instanceId,
      s.inst("sukamon").instanceId,
    ]);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    expect(s.perm("sukamon").topCard.cardId).toBe(YELLOW_LV5);
    // The host's own [On Deletion] never fired: it did not leave.
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([PLATINUM_SUKAMON]);
  });
});
