import { compiledEffects, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";
import { compiled } from "./EX13-051.js";

const CARD_ID = "EX13-051";

// Fixtures, and why each one is here:
//   BT20-047 Solarmon    BLACK Lv.3, 2000 DP, printed "＜Blocker＞." and inherited "＜Reboot＞." —
//                        the protected ALLY (a real other Digimon with ＜Blocker＞), the legal
//                        Black Lv.3 digivolution source, and the inherited-effect witness that
//                        proves the source card survives the digivolve into this card.
//   ST19-07 Tobucatmon   YELLOW Lv.4, 5000 DP, printed "＜Jamming＞." — the NEAR-MATCH negative:
//                        it carries a printed keyword, just not ＜Blocker＞, so a filter that
//                        merely checked "has some keyword" would wrongly protect it. Its
//                        ＜Barrier＞ is INHERITED text, inert while it is a top card.
//   BT1-013 Muchomon     inert RED Lv.3, 5000 DP — the plain no-keyword negative and the
//                        illegal (wrong-colour) digivolution source.
//   BT1-014 Kokatorimon  inert RED Lv.4, 4000 DP — the neutral HOST that carries this card as a
//                        digivolution card for the inherited clause, with no keyword or effect of
//                        its own to confound the unsuspend.
//   BT1-009..BT1-012     inert red main-deck Digimon — neutral deck, security and hand bulk.
const ALLY_BLOCKER = "BT20-047";
const NEAR_MATCH_KEYWORD = "ST19-07";
const NO_KEYWORD = "BT1-013";
const HOST = "BT1-014";
const DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];

function combatOf(s: ReturnType<typeof setupEngine>) {
  return (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean; hasOpenCounterWindow: boolean } }).combat;
}

/** The controller's board, laid so the leave replacement is live and payable. */
function boardWith(allies: { card: string; as: string }[], opts?: { hostSuspended?: boolean }) {
  return {
    0: {
      battleArea: [
        { card: CARD_ID, as: "guardromon", suspended: opts?.hostSuspended ?? false },
        ...allies.map((ally) => ({ ...ally })),
      ],
      hand: [{ card: "BT1-010", as: "spare" }],
      deck: DECK,
      security: ["BT1-009"],
    },
    1: { hand: [{ card: "BT1-012", as: "spareOpponent" }], deck: DECK, security: ["BT1-010"] },
  };
}

describe("EX13-051 Guardromon", () => {
  it("matches the complete catalog identity and printed text", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Guardromon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mine"],
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      rarity: "U",
    });
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition.effectText).toContain("＜Blocker＞");
    expect(definition.effectText).toContain(
      "[All Turns] When any of your other Digimon with ＜Blocker＞ would leave the battle area other than by your effects, by suspending this Digimon, they don't leave.",
    );
    expect(definition.inheritedEffectText).toBe(
      "[Opponent's Turn] [Once Per Turn] When any of your Digimon suspend, this Digimon may unsuspend.",
    );
    // No security effect is printed; nothing in the module may claim one.
    expect(definition.securityEffectText ?? "").toBe("");
  });

  it("compiles every printed clause and nothing else", () => {
    expect(compiled).toMatchObject({ cardId: CARD_ID, coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(3);

    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker" }],
    });

    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          optional: true,
          affectsAll: true,
          sourceFilter: { controller: "mine", kind: ["Digimon"], keywords: ["Blocker"], excludeSelf: true },
          target: {
            filter: { controller: "mine", kind: ["Digimon"], keywords: ["Blocker"], excludeSelf: true },
            count: "all",
          },
          cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        },
      ],
    });
    // No [Once Per Turn] is printed on the leave clause.
    expect(compiled.effects[1]!.frequency).toBeUndefined();

    expect(compiled.effects[2]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
        },
      ],
    });
    // No security clause and no digivolution/assembly override: the catalog EvoCost is the only route.
    expect(compiled.effects.some((effect) => effect.isSecurity === true)).toBe(false);
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.assemblyRequirement).toBeUndefined();

    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  // ---------------------------------------------------------------------------
  // ＜Blocker＞
  // ---------------------------------------------------------------------------

  it("＜Blocker＞ switches it in as the defender of an opposing attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "guardromon" }], deck: DECK, security: ["BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: NO_KEYWORD, as: "attacker", dp: 3000 }], deck: DECK, security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("guardromon"), "Blocker")).toBe(true);
    s.state.turnSeat = 1;
    const combat = combatOf(s);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenBlockWindow);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("guardromon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    // The block replaced the security check: 5000 DP beat the 3000 DP attacker, and blocking
    // suspended the blocker.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.perm("guardromon").isSuspended).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // [All Turns] When any of your other Digimon with ＜Blocker＞ would leave the battle area other
  // than by your effects, by suspending this Digimon, they don't leave.
  // ---------------------------------------------------------------------------

  it("saves an ally ＜Blocker＞ from the opponent's effect by suspending itself", async () => {
    const s = setupEngine(boardWith([{ card: ALLY_BLOCKER, as: "ally" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    await s.ready();
    const allyId = s.perm("ally").permanentId;
    expect(s.perm("guardromon").isSuspended).toBe(false);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([allyId, s.perm("guardromon").permanentId]),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    // The printed cost: this Digimon, and only this Digimon, suspended.
    expect(s.perm("guardromon").isSuspended).toBe(true);
    expect(s.perm("ally").isSuspended).toBe(false);
  });

  it('saves EVERY ally ＜Blocker＞ named in one leave for a single suspend ("they don\'t leave")', async () => {
    const s = setupEngine(
      boardWith([
        { card: ALLY_BLOCKER, as: "allyOne" },
        { card: ALLY_BLOCKER, as: "allyTwo" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const ids = [s.perm("allyOne").permanentId, s.perm("allyTwo").permanentId];

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent(ids, "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.filter(({ isSuspended }) => isSuspended)).toHaveLength(1);
    expect(s.perm("guardromon").isSuspended).toBe(true);
  });

  it("discriminates ＜Blocker＞ from a near-match keyword and from no keyword at all", async () => {
    for (const victim of [NEAR_MATCH_KEYWORD, NO_KEYWORD]) {
      const s = setupEngine(boardWith([{ card: victim, as: "victim" }]), {
        autoAcceptOptional: true,
        autoSelectCards: true,
      });
      await s.ready();
      const victimId = s.perm("victim").permanentId;

      advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
      expect(await advance(s.engine).verb.deletePermanent([victimId], "byEffect")).toBe(1);
      advance(s.engine).verb.leaveEffectResolution();
      await settle();

      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([victim]);
      // Nothing was charged for a Digimon the filter never watched.
      expect(s.perm("guardromon").isSuspended).toBe(false);
    }
  });

  it("does not protect the OPPONENT's ＜Blocker＞ Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "guardromon" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: ALLY_BLOCKER, as: "theirs" }], deck: DECK, security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const theirsId = s.perm("theirs").permanentId;

    // Seat 1 deleting its own Digimon by its own effect is still "not by seat 0's effects", so only
    // the printed "your" keeps this leave unprotected.
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([theirsId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("guardromon").isSuspended).toBe(false);
  });

  it("cannot save ITSELF: the printed clause watches only your OTHER Digimon", async () => {
    const s = setupEngine(boardWith([{ card: ALLY_BLOCKER, as: "ally" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    await s.ready();
    const hostId = s.perm("guardromon").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([ALLY_BLOCKER]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    // The surviving ally was never suspended: nothing paid for a leave the clause did not watch.
    expect(s.perm("ally").isSuspended).toBe(false);
  });

  it("does NOT prevent a leave caused by the controller's OWN effect", async () => {
    const s = setupEngine(boardWith([{ card: ALLY_BLOCKER, as: "ally" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([ALLY_BLOCKER]);
    expect(s.perm("guardromon").isSuspended).toBe(false);
  });

  it("prevents a leave with no effect behind it at all (battle), since only your effects are excluded", async () => {
    const s = setupEngine(boardWith([{ card: ALLY_BLOCKER, as: "ally" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([allyId], "byBattle")).toBe(0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(allyId);
    expect(s.perm("guardromon").isSuspended).toBe(true);
  });

  it("cannot pay while already suspended, so the ally leaves", async () => {
    const s = setupEngine(boardWith([{ card: ALLY_BLOCKER, as: "ally" }], { hostSuspended: true }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle();

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([ALLY_BLOCKER]);
    expect(s.perm("guardromon").isSuspended).toBe(true);
  });

  it("declines the optional window: the ally leaves and nothing suspends", async () => {
    const s = setupEngine(boardWith([{ card: ALLY_BLOCKER, as: "ally" }]), {
      autoDeclineOptional: true,
      autoSelectCards: true,
    });
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle();

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([ALLY_BLOCKER]);
    expect(s.perm("guardromon").isSuspended).toBe(false);
  });

  it("is NOT once per turn: a second ally leave in the same turn is prevented again", async () => {
    const s = setupEngine(
      boardWith([
        { card: ALLY_BLOCKER, as: "allyOne" },
        { card: ALLY_BLOCKER, as: "allyTwo" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstId = s.perm("allyOne").permanentId;
    const secondId = s.perm("allyTwo").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([firstId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("guardromon").isSuspended).toBe(true);

    // Unsuspend the host so the cost is payable again; the clause itself has no per-turn budget.
    await advance(s.engine).verb.unsuspend([s.perm("guardromon").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([secondId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("guardromon").isSuspended).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Inherited: [Opponent's Turn] [Once Per Turn] When any of your Digimon suspend, this Digimon
  // may unsuspend.
  // ---------------------------------------------------------------------------

  /** The host carrying this card as a digivolution card, plus one other Digimon to suspend. */
  function inheritedBoard(opts?: { allySuspended?: boolean }) {
    return {
      0: {
        battleArea: [
          { card: HOST, as: "host", suspended: true, under: [{ card: CARD_ID, as: "guardromonCard" }] },
          { card: NO_KEYWORD, as: "ally", suspended: opts?.allySuspended ?? false },
        ],
        hand: [{ card: "BT1-010", as: "spare" }],
        deck: DECK,
        security: ["BT1-009"],
      },
      1: { hand: [{ card: "BT1-012", as: "spareOpponent" }], deck: DECK, security: ["BT1-010"] },
    };
  }

  it("unsuspends the host when one of your Digimon suspends on the OPPONENT's turn", async () => {
    const s = setupEngine(inheritedBoard(), { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    s.state.turnSeat = 1;
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual([CARD_ID]);

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle(() => s.perm("host").isSuspended === false);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("ally").isSuspended).toBe(true);
  });

  it("unsuspends the host when an ally ＜Blocker＞ blocks an attack, through a real combat", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HOST, as: "host", suspended: true, under: [{ card: CARD_ID, as: "guardromonCard" }] },
            { card: ALLY_BLOCKER, as: "blocker", dp: 20_000 },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: NO_KEYWORD, as: "attacker", dp: 3000 }],
          hand: [{ card: "BT1-012", as: "spareOpponent" }],
          deck: DECK,
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const combat = combatOf(s);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenBlockWindow);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.perm("host").isSuspended === false);

    // The block suspended the blocker; the inherited clause woke on that suspension.
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("stays suspended on the controller's OWN turn: the printed window is the opponent's turn", async () => {
    const s = setupEngine(inheritedBoard(), { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    expect(s.state.turnSeat).toBe(0);

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle();

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("ignores the OPPONENT's Digimon suspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HOST, as: "host", suspended: true, under: [{ card: CARD_ID, as: "guardromonCard" }] }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: NO_KEYWORD, as: "theirs" }],
          hand: [{ card: "BT1-012", as: "spareOpponent" }],
          deck: DECK,
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("theirs").permanentId]);
    await settle();

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it('declines the printed "may": the host stays suspended', async () => {
    const s = setupEngine(inheritedBoard(), { autoDeclineOptional: true, autoSelectCards: true });
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle();

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("fires once per opponent turn and resets on the next one", async () => {
    const s = setupEngine(inheritedBoard(), { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle(() => s.perm("host").isSuspended === false);
    expect(s.perm("host").isSuspended).toBe(false);

    // Same opponent turn: re-suspend both, and the spent use does not come back.
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("ally").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("host").isSuspended).toBe(true);

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle();
    expect(s.perm("host").isSuspended).toBe(true);

    // A real turn of the controller's own passes, then the next opponent turn reopens the use.
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("ally").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle(() => s.perm("host").isSuspended === false);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Evolution: the printed catalog EvoCost (Black Lv.3 for 2) is the only route.
  // ---------------------------------------------------------------------------

  it("digivolves from a Black Lv.3 for 2 with the bonus draw, keeping the source as a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ALLY_BLOCKER, as: "source" }],
          hand: [{ card: CARD_ID, as: "guardromon" }],
          deck: DECK,
          security: ["BT1-009"],
        },
        1: { deck: DECK, security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const handSize = s.state.players[0]!.hand.length;
    const sourceInstanceId = s.perm("source").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("guardromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(3);
    // One card left the hand, the bonus draw put one back: net unchanged.
    expect(s.state.players[0]!.hand).toHaveLength(handSize);
    expect(s.perm("source").topCard.cardId).toBe(CARD_ID);
    // `Permanent.stack` holds only the cards beneath the top card.
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    // Source identity survives: Solarmon's inherited ＜Reboot＞ now rides the Guardromon permanent,
    // alongside Guardromon's own printed ＜Blocker＞.
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
  });

  it("refuses a RED Lv.3 source: the printed route is Black", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NO_KEYWORD, as: "source" }],
          hand: [{ card: CARD_ID, as: "guardromon" }],
          deck: DECK,
          security: ["BT1-009"],
        },
        1: { deck: DECK, security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("guardromon").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.memory).toBe(5);
    expect(s.perm("source").topCard.cardId).toBe(NO_KEYWORD);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("guardromon").instanceId);
  });

  it("digivolves onto a Black Lv.3 and immediately protects a second ally ＜Blocker＞", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: ALLY_BLOCKER, as: "source" },
            { card: ALLY_BLOCKER, as: "ally" },
          ],
          hand: [{ card: CARD_ID, as: "guardromon" }],
          deck: DECK,
          security: ["BT1-009"],
        },
        1: { deck: DECK, security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("guardromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === CARD_ID);
    const allyId = s.perm("ally").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(allyId);
    expect(s.perm("source").isSuspended).toBe(true);
  });
});
