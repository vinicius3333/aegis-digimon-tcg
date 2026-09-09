import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// BT19-055 Monitamon (Black, Lv.3, Data, CRT/Twilight/Xros Heart, DP 1000, play 3,
// evolve Black Lv.2 for 0)
//   [On Deletion] Reveal the top 3 cards of your deck. Among them, add 1 card with
//   [Knightmon] in its text or the [Twilight] trait to the hand and place 1 such card
//   under your Tamers. Return the rest to the bottom of the deck.
//   Inherited: ＜Reboot＞.
// KB Q3113: must add as many as possible (hand AND under-Tamer) when both are available.
// KB Q3114: with only 1 applicable card revealed, it goes to the hand — never under a Tamer.
//
// Fixture identities:
//   BT18-058 Kotemon prints "[Knightmon] in its text" -> matches the text clause.
//   BT10-058 Monitamon carries the [Twilight] trait   -> matches the trait clause.
//   BT19-046 Chamblemon / BT1-010 Agumon carry neither -> near-miss peers.

describe("BT19-055 Monitamon", () => {
  it("matches the catalog print", () => {
    const definition = getCardDefinition("BT19-055")!;
    expect(definition).toMatchObject({
      cardId: "BT19-055",
      nameEn: "Monitamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["CRT", "Twilight", "Xros Heart"],
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      inheritedEffectText: "＜Reboot＞.",
    });
    expect(definition.effectText!.replace(/\u00a0/g, " ")).toBe(
      "[On Deletion] Reveal the top 3 cards of your deck. Among them, add 1 card with [Knightmon] in its text or the [Twilight] trait to the hand and place 1 such card under your Tamers. Return the rest to the bottom of the deck.",
    );
  });

  it("publicly digivolves off a black Lv.2 for 0 and refuses a green Lv.2 source", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-005", as: "blackEgg" },
          hand: [{ card: "BT19-055", as: "monita" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { security: ["BT1-013"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();
    const eggInstanceId = s.inst("blackEgg").instanceId;
    const monitaInstanceId = s.inst("monita").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackEgg").permanentId,
        instanceId: monitaInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === monitaInstanceId);

    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);
    expect(s.state.memory).toBe(0);
    // Digivolve bonus draw: Monitamon left the hand and the top deck card replaced it.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("refuses an off-color Lv.2 source", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-007", as: "greenEgg" },
          hand: [{ card: "BT19-055", as: "monita" }],
          deck: ["BT1-010"],
        },
        1: { security: ["BT1-013"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const monitaInstanceId = s.inst("monita").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenEgg").permanentId,
        instanceId: monitaInstanceId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("greenEgg").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([monitaInstanceId]);
    expect(s.state.memory).toBe(5);
  });

  it("Q3113: a real battle deletion adds 1 match to hand AND places a second under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-055", as: "monita" },
            { card: "BT19-086", as: "tamer" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT18-058", "BT10-058", "BT19-046", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "bigSuspended", suspended: true }],
          security: ["BT1-014"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const deckAtMain = s.state.players[0]!.deck.map((card) => card.instanceId);
    const [revealedOne, revealedTwo, revealedThree, ...belowReveal] = deckAtMain;
    const monitaInstanceId = s.perm("monita").topCard!.instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("monita").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bigSuspended").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("tamer").stack.length === 1);

    // Monitamon lost the battle and its [On Deletion] resolved off the top 3 cards.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([monitaInstanceId]);
    // BT18-058 ([Knightmon] in its text) to hand, BT10-058 ([Twilight] trait) under the Tamer.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId, revealedOne]);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([revealedTwo]);
    // The non-matching third reveal went to the BOTTOM of the deck, under everything left.
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([...belowReveal, revealedThree]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3114: with only 1 applicable reveal it goes to the hand and nothing lands under the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-055", as: "monita" },
            { card: "BT19-086", as: "tamer" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT18-058", "BT19-046", "BT1-012", "BT1-013"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "bigSuspended", suspended: true }],
          security: ["BT1-014"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const deckAtMain = s.state.players[0]!.deck.map((card) => card.instanceId);
    const [revealedOne, revealedTwo, revealedThree, ...belowReveal] = deckAtMain;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("monita").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bigSuspended").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() && s.state.players[0]!.hand.some((card) => card.instanceId === revealedOne),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId, revealedOne]);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      ...belowReveal,
      revealedTwo,
      revealedThree,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("near-miss peers: reveals with no [Knightmon] text and no [Twilight] trait add nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-055", as: "monita" },
            { card: "BT19-086", as: "tamer" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          // BT19-046 Chamblemon (Vegetation), BT1-011 Agumon Expert (Dinosaur),
          // BT19-044 Terriermon (Beast): none names, traits or prints [Knightmon]/[Twilight].
          deck: ["BT19-046", "BT1-011", "BT19-044", "BT1-013"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "bigSuspended", suspended: true }],
          security: ["BT1-014"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const deckAtMain = s.state.players[0]!.deck.map((card) => card.instanceId);
    const [revealedOne, revealedTwo, revealedThree, ...belowReveal] = deckAtMain;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("monita").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bigSuspended").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.deck.map((card) => card.instanceId).at(-1) === revealedThree,
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      ...belowReveal,
      revealedOne,
      revealedTwo,
      revealedThree,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("inherited ＜Reboot＞ unsuspends its real host at the opponent's unsuspend phase, unlike a peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-055", as: "monita" },
            { card: "BT1-009", as: "peerNoReboot" },
          ],
          hand: [
            { card: "BT19-058", as: "skull" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-011", "BT1-012", "BT1-010"], deck: ["BT1-014", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const monitaInstanceId = s.perm("monita").topCard!.instanceId;
    s.state.memory = 6;

    // Build the stack for real: Monitamon -> SkullKnightmon (Black Lv.3 base, cost 3).
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monita").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("monita").topCard?.cardId === "BT19-058");
    expect(s.perm("monita").stack.map((card) => card.instanceId)).toEqual([monitaInstanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("monita"), "Reboot")).toBe(true);

    // Suspend the host by attacking with it, so it is genuinely suspended entering their turn.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("monita").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("monita").isSuspended);

    // The near-miss peer suspends the same way, through its own real attack, but has no
    // ＜Reboot＞ inherited under it.
    expect(observe(s.engine).hasKeyword(s.perm("peerNoReboot"), "Reboot")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("peerNoReboot").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("peerNoReboot").isSuspended);
    expect(s.perm("monita").isSuspended).toBe(true);
    expect(s.perm("peerNoReboot").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Read inside the opponent's own open Main phase, after THEIR unsuspend phase ran.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("monita").isSuspended).toBe(false);
    expect(s.perm("peerNoReboot").isSuspended).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
