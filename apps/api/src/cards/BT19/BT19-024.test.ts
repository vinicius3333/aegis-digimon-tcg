import { describe, expect, it } from "vitest";
import { Phase, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// Fixture vocabulary.
// BT19-002 Puyoyomon: the Blue Digi-Egg whose inherited [Opponent's Turn] effect returns its
//   host to the bottom of the deck. It is the public route to a NON-battle leave, and it is
//   the exact scenario of Q3058 — so it drives ＜Decode＞ without any injected timing.
// BT19-019 Shellmon: Blue Lv.4 [Aquatic] — the ＜Decode (Blue Lv.4)＞ payload and the legal
//   evolution source for MarineBullmon (Blue Lv.4, memory 3).
// BT19-018 Swimmon: Blue Lv.3 [Aquatic] — the LEVEL near-miss for ＜Decode＞ and the eligible
//   card for the inherited [End of Attack] clause.
// BT1-014 Kokatorimon: Red Lv.4 — the COLOUR near-miss for ＜Decode＞ and an illegal evolution
//   source. BT1-009 Monodramon: inert Red Lv.3 [Mini Dragon] — the trait near-miss and inert
//   security.
// BT19-021 Xiquemon: Blue Lv.4 [Aquatic] with no ＜Blocker＞ — the neighbouring stack that
//   ＜Decode＞ must not reach into.
//
// Catalog note: no card in the catalog carries a bare [Aqua] trait; the printed [Aqua] tokens
// are exported as "Aquatic" (61 cards). That is why the IR matches "Aqua"/"Sea Animal" with
// `traitContains` (substring, case-insensitive) rather than an exact trait match.
const board = (s: ReturnType<typeof setupEngine>, seat: 0 | 1): (string | undefined)[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId);
const hand = (s: ReturnType<typeof setupEngine>, seat: 0 | 1): string[] =>
  s.state.players[seat]!.hand.map((card) => card.cardId);

describe("BT19-024 MarineBullmon — catalog", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-024")).toMatchObject({
      cardId: "BT19-024",
      nameEn: "MarineBullmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Mollusk", "LIBERATOR", "Aquatic"],
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      effectText:
        "＜Decode (Blue Lv.4)＞(When this Digimon would leave the battle area other than in battle, you may play 1 Blue Level 4 Digimon card from its digivolution cards without paying the cost)\n" +
        "[On Play] [When Digivolving] You may place 1 Digimon card with [Aqua]/[Sea Animal]\u00a0in one of its traits from your hand as 1 of your Digimon's bottom digivolution card.\n" +
        "[Rule] Trait: Has the [Aquatic] type.",
      inheritedEffectText:
        "[End of Attack] [Once Per Turn] You may play 1 level 4 or lower Digimon card with [Aqua]/[Sea Animal]\u00a0in one of its traits from this Digimon's digivolution cards without paying the cost.",
    });
  });
});

describe("BT19-024 MarineBullmon — [On Play] / [When Digivolving] bottom placement", () => {
  it("[On Play] places the chosen [Aqua] hand card under another of my Digimon and leaves the near-miss in hand", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-024", as: "marine" },
            { card: "BT19-018", as: "aquatic" },
            { card: "BT1-009", as: "nonmatching" },
          ],
          battleArea: [{ card: "BT19-021", as: "other", under: ["BT19-019"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("aquatic").instanceId, s.perm("other").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("other").stack.length === 2);

    // "bottom digivolution card": Swimmon lands BELOW the Shellmon already in the stack.
    expect(s.perm("other").stack.map((card) => card.cardId)).toEqual(["BT19-018", "BT19-019"]);
    expect(hand(s, 0)).toEqual(["BT1-009"]);
    expect(board(s, 0).sort()).toEqual(["BT19-021", "BT19-024"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play] is optional: declining leaves both hand cards untouched", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-024", as: "marine" },
            { card: "BT19-018", as: "aquatic" },
          ],
          battleArea: [{ card: "BT19-021", as: "other" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => board(s, 0).includes("BT19-024"));
    await settle();

    expect(hand(s, 0)).toEqual(["BT19-018"]);
    expect(s.perm("other").stack).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Digivolving] places the card under the digivolving stack on the legal Blue Lv.4 route", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-019", as: "base" }],
          hand: [
            { card: "BT19-024", as: "marine" },
            { card: "BT19-018", as: "aquatic" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("aquatic").instanceId, s.perm("base").topCard!.instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("marine").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 2);

    expect(s.perm("base").topCard?.cardId).toBe("BT19-024");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-018", "BT19-019"]);
    // Blue Lv.4 route: memory cost 3, plus the digivolve draw.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal evolution source: Blue Lv.3 and Red Lv.4 both fail the Blue Lv.4 requirement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-018", as: "blueLv3" },
          { card: "BT1-014", as: "redLv4" },
        ],
        hand: [{ card: "BT19-024", as: "marine" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    for (const alias of ["blueLv3", "redLv4"]) {
      const result = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm(alias).permanentId,
        instanceId: s.inst("marine").instanceId,
      });
      expect(result.ok, `digivolve from ${alias}`).toBe(false);
    }
    await settle();

    expect(board(s, 0).sort()).toEqual(["BT1-014", "BT19-018"]);
    expect(hand(s, 0)).toEqual(["BT19-024"]);
    expect(s.state.memory).toBe(10);
  });
});

describe("BT19-024 MarineBullmon — [Rule] Trait: Has the [Aquatic] type (Q3078)", () => {
  it("is always [Aquatic] and therefore feeds another card's [Aqua] trait filter", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-024", as: "placer" },
            { card: "BT19-024", as: "material" },
          ],
          battleArea: [{ card: "BT19-021", as: "other" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("material").instanceId, s.perm("other").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("placer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("other").stack.length === 1);

    // Cross-card consequence: a second MarineBullmon qualifies as an [Aqua]-trait Digimon card.
    expect(s.perm("other").stack.map((card) => card.cardId)).toEqual(["BT19-024"]);
    expect(hand(s, 0)).toEqual([]);
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-024")!;
    expect(observe(s.engine).hasEffectiveTrait(played, "Aquatic")).toBe(true);
  });
});

describe("BT19-024 MarineBullmon — ＜Decode (Blue Lv.4)＞", () => {
  it("interrupts Puyoyomon's inherited return and plays the Blue Lv.4 source for free (Q3058)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-024", as: "host", under: ["BT19-002", "BT19-019"] }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 12_000 },
            { card: "BT1-009", as: "bounced" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Decode")).toBe(true);
    const marineInstanceId = s.perm("host").topCard!.instanceId;
    const bouncedInstanceId = s.perm("bounced").topCard!.instanceId;
    preferInstanceIds.push(bouncedInstanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => board(s, 0).includes("BT19-019"));
    await settle(() => s.state.players[0]!.security.length === 0);
    await settle();

    // MarineBullmon paid Puyoyomon's cost to the BOTTOM of the deck ...
    const deck = s.state.players[0]!.deck;
    expect(deck[deck.length - 1]!.instanceId).toBe(marineInstanceId);
    expect(deck).toHaveLength(3);
    // ... ＜Decode＞ still played Shellmon out of its digivolution cards, for free ...
    expect(board(s, 0)).toEqual(["BT19-019"]);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    // ... the Digi-Egg left underneath went to the trash (alongside the checked security card) ...
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT19-002"]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    // ... and Puyoyomon's own payload returned a level 5 or lower opposing Digimon to hand.
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([bouncedInstanceId]);
    expect(board(s, 1)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is optional: declining ＜Decode＞ trashes the Blue Lv.4 source instead (CR 16-36-3)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-024", as: "host", under: ["BT19-002", "BT19-019"] }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 12_000 },
            { card: "BT1-009", as: "bounced" },
          ],
          security: ["BT1-009"],
        },
      },
      // No blanket optional responder: this run must say YES to Puyoyomon's inherited effect
      // and NO to ＜Decode＞, which one shared auto-responder cannot express.
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    const marineInstanceId = s.perm("host").topCard!.instanceId;

    const answerOptional = async (accept: boolean): Promise<void> => {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const { decisionId } = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(0, { type: "respondDecision", decisionId, response: { kind: "optional", accept } }),
      ).toEqual({ ok: true });
    };

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await answerOptional(true);
    await answerOptional(false);
    await settle(() => s.state.players[0]!.deck.length === 3);
    await settleAcrossTimers(() => s.state.players[0]!.trash.length === 2);

    const deck = s.state.players[0]!.deck;
    expect(deck[deck.length - 1]!.instanceId).toBe(marineInstanceId);
    // ＜Decode＞ declined: Shellmon follows the rest of the stack into the trash and no
    // permanent is left behind.
    expect(board(s, 0)).toEqual([]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-002", "BT19-019"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not activate when the leave IS a battle deletion (CR 16-36-1)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-024", as: "host", suspended: true, under: ["BT19-019"] }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 12_000 }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);
    await settle();

    expect(board(s, 0)).toEqual([]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-019", "BT19-024"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reads only its OWN digivolution cards, and only a Blue Lv.4 one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-024", as: "host", under: ["BT19-002", "BT19-018", "BT1-014"] },
            { card: "BT19-021", as: "neighbour", under: ["BT19-019"] },
          ],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 12_000 },
            { card: "BT1-009", as: "bounced" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    const marineInstanceId = s.perm("host").topCard!.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 3);
    await settleAcrossTimers(() => s.state.players[0]!.trash.length === 3);

    // The Blue Lv.3 and the Red Lv.4 in its own stack are both near-misses, and the Blue Lv.4
    // sitting under the NEIGHBOUR is out of reach: nothing is played.
    expect(board(s, 0)).toEqual(["BT19-021"]);
    expect(s.perm("neighbour").stack.map((card) => card.cardId)).toEqual(["BT19-019"]);
    const deck = s.state.players[0]!.deck;
    expect(deck[deck.length - 1]!.instanceId).toBe(marineInstanceId);
    // Every card that was under MarineBullmon went to the trash: ＜Decode＞ played none of them.
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-014", "BT19-002", "BT19-018"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT19-024 MarineBullmon — inherited [End of Attack] [Once Per Turn]", () => {
  it("plays exactly one eligible source per attack from its real host's stack, and the counter resets on my next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-021", as: "host", under: ["BT19-024", "BT19-018", "BT19-018", "BT1-009"] }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"], hand: ["BT1-009"], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    const attackPlayer = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });

    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => board(s, 0).includes("BT19-018"));
    await settle();

    // Exactly one of the two eligible Swimmon left the stack; the Red [Mini Dragon] Monodramon
    // and the level 5 MarineBullmon itself are near-misses that were never candidates.
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT19-024", "BT19-018", "BT1-009"]);
    expect(board(s, 0).sort()).toEqual(["BT19-018", "BT19-021"]);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    // CR §11-2-3 caps a Digimon at one attack per turn, so the same-turn refusal of an
    // [End of Attack] [Once Per Turn] clause is unreachable from public intents without an
    // extra-attack grant. What IS provable through the real turn loop is the reset: the
    // opponent's whole turn passes, then my own attack fires the clause a second time.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    s.perm("host").isSuspended = false;
    await s.ready();

    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.length === 2);
    await settle();

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT19-024", "BT1-009"]);
    expect(board(s, 0).filter((cardId) => cardId === "BT19-018")).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
