import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * BT19-059 DeadlyAxemon — Black/Purple Lv.4 Champion, 4000 DP, play cost 4,
 * evo cost 3 from a Black or Purple Lv.3.
 *
 * Printed clauses:
 *   1. ＜Retaliation＞                    (main, keyword, CR 16-13)
 *   2. [On Deletion] ＜Save＞             (main, CR 16-20 / 4-3-2)
 *   3. ＜Reboot＞                         (inherited, CR 16-11)
 *
 * KB: `node tools/kb/query.mjs card BT19-059` reports no knowledge-base entries —
 * no Q&A, errata or banlist row, matching docs/audits/BT19-reaudit/KB-INDEX.md.
 */

const PLAIN_LV4_PEER = "BT1-014"; // Kokatorimon: Red Lv.4, 4000 DP, no effects, no keywords
const BIG_ATTACKER = "BT1-013"; // Muchomon: Red Lv.3, 5000 DP, no effects
const BLACK_LV3 = "BT2-052"; // Hagurumon: Black Lv.3, 3000 DP, no effects
const PURPLE_LV3 = "BT2-067"; // DemiDevimon: Purple Lv.3, 3000 DP, no effects
const GREEN_LV3 = "BT1-064"; // Goblimon: Green Lv.3, 3000 DP, no effects — illegal source
const INERT_SECURITY = "BT1-009"; // Monodramon: main-deck Lv.3, 3000 DP, never a Digi-Egg
const DECK = ["BT1-009", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-012"];

describe("BT19-059 DeadlyAxemon", () => {
  it("matches the catalog printing and compiles all three clauses with no residual", () => {
    expect(getCardDefinition("BT19-059")).toMatchObject({
      cardId: "BT19-059",
      nameEn: "DeadlyAxemon",
      colors: ["Black", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Animal", "Twilight"],
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      effectText: "＜Retaliation＞ \n[On Deletion] ＜Save＞.",
      inheritedEffectText: "＜Reboot＞.",
    });

    const card = runtimeCompiledCard("BT19-059");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Retaliation" }] },
      {
        trigger: "OnDeletion",
        keywords: [{ keyword: "Save" }],
        actions: [{ kind: "PlaceUnder", underFilter: { controller: "mine", kind: ["Tamer"] }, optional: true }],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Reboot" }] },
    ]);
    expect(card?.digivolutionRequirement ?? []).toEqual([]);
  });

  it("＜Retaliation＞ deletes the attacker that beat it in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: BIG_ATTACKER, as: "attacker" }], deck: DECK },
        1: {
          battleArea: [{ card: "BT19-059", as: "axe", suspended: true }],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const axeInstanceId = s.perm("axe").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("axe").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "combatResolved"));
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    // 5000 beats 4000, so DeadlyAxemon is deleted in battle — and ＜Retaliation＞ (CR 16-13-1)
    // takes the Digimon it battled down with it.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([axeInstanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([BIG_ATTACKER]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec").instanceId]);
  });

  it("NEGATIVE CONTROL: an identical 4000 DP peer without ＜Retaliation＞ leaves the attacker alive", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: BIG_ATTACKER, as: "attacker" }], deck: DECK },
      1: {
        battleArea: [{ card: PLAIN_LV4_PEER, as: "peer", suspended: true }],
        security: [{ card: INERT_SECURITY, as: "sec" }],
        deck: DECK,
      },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("peer").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([attackerId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("＜Save＞ places the deleted card at the BOTTOM of one of YOUR Tamers, never the opponent's", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-059", as: "axe" },
            { card: "BT19-086", as: "tamer", under: [{ card: BIG_ATTACKER, as: "beneath" }] },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT19-083", as: "opponentTamer" }],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const selfId = s.perm("axe").topCard!.instanceId;
    const beneathId = s.inst("beneath").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("axe").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === selfId));

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([selfId, beneathId]);
    // Near-miss peer: an opponent-controlled Tamer is not a legal ＜Save＞ destination.
    expect(s.perm("opponentTamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === selfId)).toBe(false);
  });

  it("＜Save＞ is optional: declining leaves the card in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-059", as: "axe" },
            { card: "BT19-086", as: "tamer" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const selfId = s.perm("axe").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("axe").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === selfId));

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([selfId]);
  });

  it("inherited ＜Reboot＞ unsuspends its host during the OPPONENT's unsuspend phase", async () => {
    // Seat 0's Main auto-passes once its last legal action is spent, and the turn hand-over
    // happens inside the same settle that observes the final suspension — so the mid-turn
    // state is captured as it is emitted rather than read after the fact.
    const bothSuspendedOnSeat0: boolean[] = [];
    let s: ReturnType<typeof setupEngine>;
    s = setupEngine(
      {
        0: {
          battleArea: [
            { card: PLAIN_LV4_PEER, as: "host", under: ["BT19-059"] },
            { card: PLAIN_LV4_PEER, as: "bare" },
          ],
          deck: DECK,
          security: [{ card: INERT_SECURITY, as: "own" }],
        },
        1: {
          security: [
            { card: INERT_SECURITY, as: "sec1" },
            { card: INERT_SECURITY, as: "sec2" },
            { card: INERT_SECURITY, as: "sec3" },
          ],
          deck: DECK,
        },
      },
      {
        onEvent: () => {
          if (s === undefined || s.state.turnSeat !== 0) return;
          const battleArea = s.state.players[0]!.battleArea;
          if (battleArea.length !== 2) return;
          bothSuspendedOnSeat0.push(battleArea.every((permanent) => permanent.isSuspended));
        },
      },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Suspend both Digimon the real way: by attacking with them on their controller's turn.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bare").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bare").isSuspended);
    expect(s.perm("bare").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => bothSuspendedOnSeat0.includes(true));
    // Both are genuinely suspended inside seat 0's own turn, before any unsuspend phase.
    expect(bothSuspendedOnSeat0).toContain(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // Seat 1's unsuspend phase has run: ＜Reboot＞ (CR 16-11-1) stood the host back up, while
    // the identical bare peer — same card, no BT19-059 beneath it — stays suspended.
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("bare").isSuspended).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves for 3 from a Black Lv.3 and from a Purple Lv.3, but not from a Green Lv.3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: BLACK_LV3, as: "black" },
          { card: PURPLE_LV3, as: "purple" },
          { card: GREEN_LV3, as: "green" },
        ],
        hand: [
          { card: "BT19-059", as: "one" },
          { card: "BT19-059", as: "two" },
          { card: "BT19-059", as: "three" },
        ],
        deck: DECK,
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 9;
    await s.ready();
    const blackBaseId = s.perm("black").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("green").permanentId,
        instanceId: s.inst("three").instanceId,
        useAlternateCost: true,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("green").permanentId,
        instanceId: s.inst("three").instanceId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.perm("green").topCard?.cardId).toBe(GREEN_LV3);
    expect(s.state.memory).toBe(9);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("black").permanentId,
        instanceId: s.inst("one").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("black").topCard?.cardId === "BT19-059");
    expect(s.state.memory).toBe(6);
    expect(s.perm("black").stack.map((card) => card.instanceId)).toEqual([blackBaseId]);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purple").permanentId,
        instanceId: s.inst("two").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purple").topCard?.cardId === "BT19-059");
    expect(s.state.memory).toBe(3);
    expect(s.perm("purple").topCard!.instanceId).toBe(s.inst("two").instanceId);
    // Each digivolve granted its bonus draw off the top of the deck (CR 6-2-2).
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-059", "BT1-009", "BT1-012"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-014", "BT1-009", "BT1-012"]);
  });
});
