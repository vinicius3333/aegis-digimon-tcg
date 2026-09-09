import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * BT19-058 SkullKnightmon — Black/Purple Lv.4 Champion, 4000 DP, play cost 4,
 * evo cost 3 from a Black or Purple Lv.3.
 *
 * Printed clauses:
 *   1. ＜Blocker＞                       (main, keyword, CR 16-5)
 *   2. [On Deletion] ＜Save＞            (main, CR 16-20 / 4-3-2)
 *   3. ＜Blocker＞                       (inherited)
 *
 * KB: `node tools/kb/query.mjs card BT19-058` reports no knowledge-base entries —
 * no Q&A, errata or banlist row, matching docs/audits/BT19-reaudit/KB-INDEX.md.
 */

const PLAIN_LV4_PEER = "BT1-014"; // Kokatorimon: Red Lv.4, 4000 DP, no effects, no keywords
const BIG_ATTACKER = "BT1-013"; // Muchomon: Red Lv.3, 5000 DP, no effects
const BLACK_LV3 = "BT2-052"; // Hagurumon: Black Lv.3, 3000 DP, no effects
const PURPLE_LV3 = "BT2-067"; // DemiDevimon: Purple Lv.3, 3000 DP, no effects
const GREEN_LV3 = "BT1-064"; // Goblimon: Green Lv.3, 3000 DP, no effects — illegal source
const INERT_SECURITY = "BT1-009"; // Monodramon: main-deck Lv.3, never a Digi-Egg
const DECK = ["BT1-009", "BT1-012", "BT1-013", "BT1-014"];

describe("BT19-058 SkullKnightmon", () => {
  it("matches the catalog printing and compiles all three clauses with no residual", () => {
    expect(getCardDefinition("BT19-058")).toMatchObject({
      cardId: "BT19-058",
      nameEn: "SkullKnightmon",
      colors: ["Black", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Undead", "Twilight"],
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      effectText: "＜Blocker＞ \n[On Deletion] ＜Save＞.",
      inheritedEffectText: "＜Blocker＞.",
    });

    const card = runtimeCompiledCard("BT19-058");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
      {
        trigger: "OnDeletion",
        keywords: [{ keyword: "Save" }],
        actions: [{ kind: "PlaceUnder", underFilter: { controller: "mine", kind: ["Tamer"] }, optional: true }],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] },
    ]);
    // No printed [Digivolve] line: only the two evo costs above are legal routes.
    expect(card?.digivolutionRequirement ?? []).toEqual([]);
  });

  it("blocks a real attack that its non-Blocker peer cannot block", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: BIG_ATTACKER, as: "attacker" }], deck: DECK },
      1: {
        battleArea: [
          { card: "BT19-058", as: "skull" },
          { card: PLAIN_LV4_PEER, as: "peer" },
        ],
        security: [{ card: INERT_SECURITY, as: "sec" }],
        deck: DECK,
      },
    });
    await s.ready();
    const skullId = s.perm("skull").permanentId;
    const peerId = s.perm("peer").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"));

    const opened = s.events.find((e) => e.kind === "blockWindowOpened");
    const eligible = opened !== undefined && "eligibleBlockerIds" in opened ? opened.eligibleBlockerIds : [];
    expect(eligible).toContain(skullId);
    expect(eligible).not.toContain(peerId);
    // Near-miss peer: same level and DP, no ＜Blocker＞ — the engine refuses its block.
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: peerId }).ok).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: skullId })).toEqual({ ok: true });

    await settle(() => s.events.some((e) => e.kind === "combatResolved"));
    // 5000 attacker beats the 4000 blocker; the block spent the security check.
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([peerId]);
    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([s.inst("sec").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("gives a host it sits under ＜Blocker＞ as an inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: BIG_ATTACKER, as: "attacker" }], deck: DECK },
      1: {
        battleArea: [
          { card: PLAIN_LV4_PEER, as: "host", under: ["BT19-058"] },
          { card: PLAIN_LV4_PEER, as: "bare" },
        ],
        security: [{ card: INERT_SECURITY, as: "sec" }],
        deck: DECK,
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const bareId = s.perm("bare").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"));

    const opened = s.events.find((e) => e.kind === "blockWindowOpened");
    const eligible = opened !== undefined && "eligibleBlockerIds" in opened ? opened.eligibleBlockerIds : [];
    // Stack proof: the identical bare peer differs only by the digivolution card underneath.
    expect(eligible).toContain(hostId);
    expect(eligible).not.toContain(bareId);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: bareId }).ok).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: hostId })).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([bareId]);
  });

  it("＜Save＞ places the deleted card at the BOTTOM of a controller's Tamer, not in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-058", as: "skull" },
            { card: "BT19-086", as: "tamer", under: [{ card: BIG_ATTACKER, as: "beneath" }] },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const selfId = s.perm("skull").topCard!.instanceId;
    const beneathId = s.inst("beneath").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("skull").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === selfId));

    // CR 4-3-2: ＜Save＞ places the card at the bottom of the Tamer's digivolution cards.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([selfId, beneathId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === selfId)).toBe(false);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-086"]);
  });

  it("＜Save＞ is optional: declining leaves the card in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-058", as: "skull" },
            { card: "BT19-086", as: "tamer" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const selfId = s.perm("skull").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("skull").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === selfId));

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([selfId]);
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
          { card: "BT19-058", as: "one" },
          { card: "BT19-058", as: "two" },
          { card: "BT19-058", as: "three" },
        ],
        deck: DECK,
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 9;
    await s.ready();
    const blackBaseId = s.perm("black").topCard!.instanceId;

    // Illegal source: Green is not one of the two printed evo colors, and no [Digivolve] line
    // waives it. Both the plain and the alternate-cost request must be refused.
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
    await settle(() => s.perm("black").topCard?.cardId === "BT19-058");
    expect(s.state.memory).toBe(6);
    expect(s.perm("black").stack.map((card) => card.instanceId)).toEqual([blackBaseId]);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purple").permanentId,
        instanceId: s.inst("two").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purple").topCard?.cardId === "BT19-058");
    expect(s.state.memory).toBe(3);
    // Each digivolve also granted its bonus draw (CR 6-2-2): two draws off the top of the deck.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-058", "BT1-009", "BT1-012"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("three").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.perm("purple").topCard!.instanceId).toBe(s.inst("two").instanceId);
  });
});
