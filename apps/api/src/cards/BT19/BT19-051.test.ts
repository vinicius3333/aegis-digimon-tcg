import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { digiXrosMatches } from "../../engine/combat/keywords.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-051.js";

/**
 * BT19-051 AtlurBallistamon (Green/Black, Lv.5, Vaccine, Machine/Xros Heart, 7000 DP,
 * play cost 7).
 *
 * Printed:
 *   [Digivolve] Lv.4 w/[Xros Heart] trait: Cost 3
 *   This card is also treated as [Ballistamon] for a DigiXros.
 *   [On Play] [When Digivolving] 1 of your Digimon can't be returned to the hand or deck and
 *     gets +3000 DP until the end of your opponent's turn.
 *   [On Deletion] You may place 1 Digimon card with the [Xros Heart]/[Blue Flare] trait from
 *     your hand or trash under any of your Tamers.
 *   Inherited: [Opponent's Turn] This Digimon with the [Xros Heart] trait gains ＜Blocker＞.
 *
 * The return protection is proved against REAL opponent bounce cards (BT15-090 Fox Fire to the
 * hand, BT19-092 Wadatsumi Purification to the deck) played from the opponent's hand inside a
 * running production turn loop, and the inherited ＜Blocker＞ by a real block declaration on the
 * opponent's real turn — never by a keyword flag or an injected turn seat.
 */

const INERT_SECURITY = ["BT1-009", "BT1-011", "BT1-012"];
const INERT_DECK = ["BT1-012", "BT1-012", "BT1-012"];

type Setup = ReturnType<typeof setupEngine>;

async function openMain(s: Setup, seat: 0 | 1): Promise<void> {
  await advance(s.engine).waitForMainPhase(seat);
}

function closeMain(s: Setup, seat: 0 | 1): void {
  advance(s.engine).endMainPhaseIfOpen(seat);
}

async function stopLoop(s: Setup, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT19-051 AtlurBallistamon", () => {
  it("matches the printed catalog entry and compiles every printed clause", () => {
    expect(getCardDefinition("BT19-051")).toMatchObject({
      cardId: "BT19-051",
      nameEn: "AtlurBallistamon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      attributes: ["Vaccine"],
      types: ["Machine", "Xros Heart"],
    });
    // The catalog prints non-breaking spaces inside the printed clauses; compare on the
    // normalized text so the assertions are about wording, not whitespace encoding.
    expect(getCardDefinition("BT19-051")!.inheritedEffectText!.replace(/\u00a0/g, " ")).toBe(
      "[Opponent's Turn] This Digimon with the [Xros Heart] trait gains ＜Blocker＞.",
    );
    expect(getCardDefinition("BT19-051")!.effectText!.replace(/\u00a0/g, " ")).toBe(
      "[Digivolve]Lv.4 w/[Xros Heart] trait: Cost 3 \n\n" +
        "This card is also treated as [Ballistamon] for a DigiXros.\n" +
        "[On Play] [When Digivolving] 1 of your Digimon can't be returned to the hand or deck and " +
        "gets +3000 DP until the end of your opponent's turn.\n" +
        "[On Deletion] You may place 1 Digimon card with the [Xros Heart]/[Blue Flare] trait from " +
        "your hand or trash under any of your Tamers.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(digivolutionRequirementsFor("BT19-051")).toContainEqual({
      level: 4,
      traits: ["Xros Heart"],
      cost: 3,
      isAlternate: true,
    });

    // Q3105: the alias is scoped to the DigiXros material check only. `grant: "name"` plus
    // `digiXrosOnly` is the shape the material check reads; `grant: "nameForDigiXros"` is dead.
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Ballistamon"], digiXrosOnly: true }],
    });
    for (const [index, trigger] of [
      [1, "OnPlay"],
      [2, "WhenDigivolving"],
    ] as const) {
      expect(compiled.effects?.[index]).toMatchObject({
        trigger,
        actions: [
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "untilOpponentTurnEnd",
            target: { count: 1, bindAs: "atlurTarget", filter: { controller: "mine", kind: ["Digimon"] } },
          },
          // The same selection carries both halves of the printed sentence.
          {
            kind: "Restrict",
            restriction: "beReturned",
            duration: "untilOpponentTurnEnd",
            target: { fromSelectionRef: "atlurTarget" },
          },
        ],
      });
    }
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          optional: true,
          underFilter: { controller: "mine", kind: ["Tamer"] },
          target: {
            count: 1,
            // The executable source field. Without it the loose-card sweep falls back to
            // ["hand", "trash", "deck"] and would reach the deck the card never names.
            from: ["hand", "trash"],
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }],
            },
          },
        },
      ],
    });
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Blocker" } },
          while: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] } },
        },
      ],
    });
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] Lv.4 w/[Xros Heart] trait: Cost 3
  // ---------------------------------------------------------------------------

  it("publicly digivolves from a Lv.4 [Xros Heart] source for the reduced cost of 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-047", as: "base" }],
          hand: [{ card: "BT19-051", as: "atlur" }],
          deck: [{ card: "BT1-012", as: "bonusDraw" }],
          security: INERT_SECURITY,
        },
        1: { security: INERT_SECURITY, deck: INERT_DECK },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("atlur").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-051");

    // 5 - 3: the [Xros Heart] route, not the 4 the colour route would charge.
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    // The [When Digivolving] clause resolved onto the only legal target: itself.
    expect(s.perm("base").currentDP).toBe(10_000);
    expect(observe(s.engine).isRestricted(s.perm("base"), "beReturned")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    assertNoLoudGap(s);
  });

  it("charges the printed colour cost of 4 from a Lv.4 source without the [Xros Heart] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-071", as: "vegiemon" }],
          hand: [{ card: "BT19-051", as: "atlur" }],
          deck: [{ card: "BT1-012", as: "bonusDraw" }],
          security: INERT_SECURITY,
        },
        1: { security: INERT_SECURITY, deck: INERT_DECK },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("vegiemon").permanentId,
        instanceId: s.inst("atlur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("vegiemon").topCard?.cardId === "BT19-051");

    // 5 - 4: the green Lv.4 colour route. The memory delta is the only thing separating the
    // two routes, so this is what proves the reduced route above was really taken.
    expect(s.state.memory).toBe(1);
  });

  it("refuses the [Xros Heart] route from a source without that trait and from a Lv.5 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-071", as: "vegiemon" },
          { card: "BT19-038", as: "xrosLevelFive" },
        ],
        hand: [{ card: "BT19-051", as: "atlur" }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    s.state.memory = 5;
    await s.ready();
    const atlurId = s.inst("atlur").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("vegiemon").permanentId,
        instanceId: atlurId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("xrosLevelFive").permanentId,
        instanceId: atlurId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).not.toEqual({ ok: true });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([atlurId]);
    expect(s.state.memory).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] +3000 DP and no return to hand or deck.
  // ---------------------------------------------------------------------------

  it("puts both halves of the [On Play] clause on one chosen other Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-047", as: "peer" }],
          hand: [{ card: "BT19-051", as: "atlur" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { security: INERT_SECURITY, deck: INERT_DECK },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("peer").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("atlur").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("peer").currentDP === 7000);

    // The clause is "1 of your Digimon", so the chosen peer holds BOTH halves and the
    // freshly played AtlurBallistamon holds neither.
    expect(s.perm("peer").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("peer"), "beReturned")).toBe(true);
    expect(s.perm("atlur").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("atlur"), "beReturned")).toBe(false);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it.each([
    ["BT15-090", "hand"],
    ["BT19-092", "deck"],
  ] as const)("stops a real opponent %s from moving the protected Digimon to the %s", async (bounceCard, zone) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-047", as: "peer" }],
          hand: [{ card: "BT19-051", as: "atlur" }, "BT1-012"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          // Blue Option colour requirement.
          battleArea: [{ card: "BT1-028", as: "opponentBlueSource", dp: 20_000 }],
          hand: [{ card: bounceCard, as: "bounce" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("peer").topCard!.instanceId);
    const peerInstanceId = s.perm("peer").topCard!.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("atlur").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("peer").currentDP === 7000);
    expect(observe(s.engine).isRestricted(s.perm("peer"), "beReturned")).toBe(true);

    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    // The Lv.4 peer is the opponent's only legal bounce target, and it is the protected one.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === bounceCard));
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    // The opponent's Option resolved and was spent, and the protected Digimon stayed put.
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([bounceCard]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(peerInstanceId);
    const destination = zone === "hand" ? s.state.players[0]!.hand : s.state.players[0]!.deck;
    expect(destination.map((card) => card.instanceId)).not.toContain(peerInstanceId);
  });

  it.each([
    ["BT15-090", "hand"],
    ["BT19-092", "deck"],
  ] as const)("control: the same %s returns an unprotected peer to the %s", async (bounceCard, zone) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-047", as: "peer" }],
          hand: ["BT1-012"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-028", as: "opponentBlueSource", dp: 20_000 }],
          hand: [{ card: bounceCard, as: "bounce" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("peer").topCard!.instanceId);
    const peerInstanceId = s.perm("peer").topCard!.instanceId;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    const destination = zone === "hand" ? s.state.players[0]!.hand : s.state.players[0]!.deck;
    expect(destination.map((card) => card.instanceId)).toContain(peerInstanceId);
  });

  it("expires the +3000 DP and the return lock at the end of the opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-047", as: "peer" }],
          hand: [{ card: "BT19-051", as: "atlur" }, "BT1-012"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { security: INERT_SECURITY, deck: INERT_DECK, hand: ["BT1-012"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("peer").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("atlur").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("peer").currentDP === 7000);

    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);
    // Still live throughout the opponent's own turn.
    expect(s.perm("peer").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("peer"), "beReturned")).toBe(true);
    closeMain(s, 1);
    await openMain(s, 0);

    // Gone once that turn ended.
    expect(s.perm("peer").currentDP).toBe(4000);
    expect(observe(s.engine).isRestricted(s.perm("peer"), "beReturned")).toBe(false);
    closeMain(s, 0);
    await stopLoop(s, loop, 0);
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] place a [Xros Heart]/[Blue Flare] Digimon card under a Tamer.
  // ---------------------------------------------------------------------------

  it.each(["hand", "trash"] as const)(
    "places a %s [Xros Heart] card under a Tamer after a real deletion",
    async (zone) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-051", as: "atlur" },
              { card: "BT1-088", as: "tamer" },
            ],
            security: INERT_SECURITY,
            deck: INERT_DECK,
            ...(zone === "hand"
              ? { hand: [{ card: "BT19-047", as: "candidate" }, "BT1-012"] }
              : { hand: ["BT1-012"], trash: [{ card: "BT19-047", as: "candidate" }] }),
          },
          1: {
            battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
            security: INERT_SECURITY,
            deck: INERT_DECK,
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      // The deleted card is itself in the trash and itself eligible (CR 4-14-1/2), so pin the
      // candidate under test by instance id rather than relying on candidate order.
      preferred.push(s.inst("candidate").instanceId);
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await openMain(s, 0);

      // A real battle deletion: AtlurBallistamon (7000 DP) attacks a 20000 DP wall and dies.
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("atlur").permanentId,
          target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("tamer").stack.length === 1);
      closeMain(s, 0);
      await stopLoop(s, loop, 0);

      expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("candidate").instanceId]);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-051"]);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-012"]);
    },
  );

  it("ignores a card with neither trait and never reaches the deck (4-14-1: its own card is in the trash)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-051", as: "atlur" },
            { card: "BT1-088", as: "tamer" },
          ],
          // Near miss: a Digimon card with neither the [Xros Heart] nor the [Blue Flare] trait.
          hand: [{ card: "BT1-071", as: "wrongTrait" }, "BT1-012"],
          deck: [{ card: "BT19-047", as: "deckCandidate" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    // Bias the pick toward the illegal deck candidate: if the source zones were ever widened
    // to the deck, this preference would make it land instead of failing silently.
    preferred.push(s.inst("deckCandidate").instanceId, s.inst("wrongTrait").instanceId);
    const atlurInstanceId = s.perm("atlur").topCard!.instanceId;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("atlur").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT19-051"));
    closeMain(s, 0);
    await stopLoop(s, loop, 0);

    // CR 4-14-1/2: the deleted AtlurBallistamon is already in the trash when its own
    // [On Deletion] resolves, and it IS a Digimon card with the [Xros Heart] trait, so it is
    // the only eligible candidate here. Pin it by instance id.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([atlurInstanceId]);
    // Neither the wrong-trait hand card nor the eligible DECK card was reachable.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrongTrait").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckCandidate").instanceId);
  });

  it("declining the optional placement leaves the candidate in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-051", as: "atlur" },
            { card: "BT1-088", as: "tamer" },
          ],
          hand: [{ card: "BT19-047", as: "candidate" }, "BT1-012"],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("atlur").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT19-051"));
    closeMain(s, 0);
    await stopLoop(s, loop, 0);

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
  });

  // ---------------------------------------------------------------------------
  // "This card is also treated as [Ballistamon] for a DigiXros." — Q3105.
  // ---------------------------------------------------------------------------

  it("is a legal [Ballistamon] DigiXros material but keeps its printed name", async () => {
    expect(digiXrosRequirementFor("BT10-013")?.[0]?.count).toBe(2);
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-051", as: "atlur" }],
        hand: [
          { card: "BT10-013", as: "x5" },
          { card: "BT19-008", as: "shoutmon" },
        ],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    s.state.memory = 10;
    await s.ready();

    // The alias never reaches ordinary name matching.
    expect(observe(s.engine).effectiveNames(s.perm("atlur"))).toEqual(["atlurballistamon"]);

    // Exactly two materials, so the DigiXros is legal only if this card answers [Ballistamon].
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x5").instanceId,
        digiXros: { materialInstanceIds: [s.inst("atlur").instanceId, s.inst("shoutmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-013"));

    expect(
      s
        .perm("x5")
        .stack.map((card) => card.cardId)
        .sort(),
    ).toEqual(["BT19-008", "BT19-051"]);
  });

  it("does not let a Digimon with no matching name stand in for the same slot", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-046", as: "nearMiss" }],
        hand: [
          { card: "BT10-013", as: "x5" },
          { card: "BT19-008", as: "shoutmon" },
        ],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: { security: INERT_SECURITY, deck: INERT_DECK },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x5").instanceId,
        digiXros: { materialInstanceIds: [s.inst("nearMiss").instanceId, s.inst("shoutmon").instanceId] },
      }),
    ).not.toEqual({ ok: true });
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-046"]);
  });

  it("is not a ＜Material Save＞-eligible [Ballistamon] under a Tamer (Q3105)", async () => {
    // The DigiXros-only alias is invisible to the eligibility test ＜Material Save＞ uses,
    // while a real [Ballistamon] card answers it.
    expect(digiXrosMatches("BT10-013", "BT19-051")).toBe(false);
    expect(digiXrosMatches("BT10-013", "BT19-047")).toBe(true);

    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-013", as: "x5", dp: 6000, under: ["BT19-051", "BT19-047", "BT19-008"] },
            { card: "BT1-088", as: "tamer" },
          ],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          security: INERT_SECURITY,
          deck: INERT_DECK,
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("x5").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length > 0);
    closeMain(s, 0);
    await stopLoop(s, loop, 0);

    expect(
      s
        .perm("tamer")
        .stack.map((card) => card.cardId)
        .sort(),
    ).toEqual(["BT19-008", "BT19-047"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-051");
  });

  // ---------------------------------------------------------------------------
  // Inherited [Opponent's Turn] ＜Blocker＞ for an [Xros Heart] host.
  // ---------------------------------------------------------------------------

  it("lets only an [Xros Heart] host block on the opponent's real turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-038", as: "xrosHost", under: [{ card: "BT19-051", as: "underAtlur" }] },
          // Near miss: same digivolution card, a host without the [Xros Heart] trait.
          { card: "BT1-071", as: "plainHost", under: ["BT19-051"] },
        ],
        security: INERT_SECURITY,
        deck: INERT_DECK,
      },
      1: {
        battleArea: [{ card: "BT1-013", as: "attacker", dp: 3000 }],
        security: INERT_SECURITY,
        deck: INERT_DECK,
      },
    });
    await s.ready();
    expect(s.perm("xrosHost").stack.map((card) => card.instanceId)).toEqual([s.inst("underAtlur").instanceId]);
    // Nothing on the controller's own turn: the clause is [Opponent's Turn].
    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Blocker")).toBe(false);

    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Blocker")).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    // The host without the trait cannot answer the block window; the [Xros Heart] host can.
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("plainHost").permanentId }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("xrosHost").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // The 3000 DP attacker lost to the 7000 DP blocker; no security was checked.
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.security).toHaveLength(3);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);
  });
});
