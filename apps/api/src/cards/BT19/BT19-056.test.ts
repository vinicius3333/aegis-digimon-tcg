import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// BT19-056 Monodramon (Black, Lv.3, Vaccine, Mini Dragon, DP 1000, play 3,
// evolve Black Lv.2 for 0)
//   [On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Dragonkin]/[Cyborg]
//   trait and 1 [Ryo Akiyama] or 1 [Device] trait Option card among them to the hand.
//   Return the rest to the bottom of the deck.
//   Inherited: [All Turns] This Digimon gets +1000 DP.
// KB Q3115: must add as many as possible.
// KB Q3116: the two categories are (a) [Dragonkin] or [Cyborg] trait, (b) a card NAMED
//           [Ryo Akiyama] OR an Option card with the [Device] trait.
//
// Fixture identities:
//   BT19-052 Vespamon    -> [Cyborg] trait          (category a)
//   BT19-060 Strikedramon-> [Dragonkin] trait       (category a)
//   BT19-086 / EX2-062   -> named "Ryo Akiyama"     (category b, exact name)
//   BT19-095 Knight Device -> Option, [Device] trait (category b)
//   BT1-009 Monodramon   -> [Mini Dragon], NOT [Dragonkin] -> near-miss for (a)
//   BT19-089 Red Card    -> Option with no [Device] trait  -> near-miss for (b)

describe("BT19-056 Monodramon", () => {
  it("matches the catalog print", () => {
    const definition = getCardDefinition("BT19-056")!;
    expect(definition).toMatchObject({
      cardId: "BT19-056",
      nameEn: "Monodramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mini Dragon"],
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
    expect(definition.effectText!.replace(/\u00a0/g, " ")).toBe(
      "[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Dragonkin]/[Cyborg] trait and 1 [Ryo Akiyama] or 1 [Device] trait Option card among them to the hand. Return the rest to the bottom of the deck.",
    );
  });

  it("Q3115/Q3116: a public play adds one card from EACH category and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-056", as: "mono" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT19-052", "BT19-086", "BT19-046", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const deckAtMain = s.state.players[0]!.deck.map((card) => card.instanceId);
    const [cyborg, ryo, nonMatch, ...belowReveal] = deckAtMain;
    const monoInstanceId = s.inst("mono").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: monoInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === ryo));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([monoInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId, cyborg, ryo]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([...belowReveal, nonMatch]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("accepts a [Device] trait Option for the second category and a [Dragonkin] card for the first", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-056", as: "mono" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT19-060", "BT19-095", "BT1-012", "BT1-011"],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const deckAtMain = s.state.players[0]!.deck.map((card) => card.instanceId);
    const [dragonkin, deviceOption, nonMatch, ...belowReveal] = deckAtMain;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mono").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === deviceOption));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("spare").instanceId,
      dragonkin,
      deviceOption,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([...belowReveal, nonMatch]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("near-miss peers: [Mini Dragon] and a non-[Device] Option are refused, an off-set [Ryo Akiyama] is not", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-056", as: "mono" },
            { card: "BT1-010", as: "spare" },
          ],
          // BT1-009 Monodramon: [Mini Dragon], not [Dragonkin]/[Cyborg].
          // BT19-089 Red Card: an Option with no [Device] trait.
          // EX2-062 Ryo Akiyama: a DIFFERENT printing of the exact name — must still match.
          deck: ["BT1-009", "BT19-089", "EX2-062", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const deckAtMain = s.state.players[0]!.deck.map((card) => card.instanceId);
    const [miniDragon, plainOption, ryo, ...belowReveal] = deckAtMain;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mono").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === ryo));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId, ryo]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([...belowReveal, miniDragon, plainOption]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("adds nothing when neither category is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-056", as: "mono" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-009", "BT19-089", "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const deckAtMain = s.state.players[0]!.deck.map((card) => card.instanceId);
    const [first, second, third, ...belowReveal] = deckAtMain;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mono").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.map((card) => card.instanceId).at(-1) === third);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([...belowReveal, first, second, third]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly digivolves off a black Lv.2 for 0 and refuses a green Lv.2 source", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-005", as: "blackEgg" },
          hand: [{ card: "BT19-056", as: "mono" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { security: ["BT1-013"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();
    const eggInstanceId = s.inst("blackEgg").instanceId;
    const monoInstanceId = s.inst("mono").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackEgg").permanentId,
        instanceId: monoInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === monoInstanceId);

    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("refuses an off-color Lv.2 source", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-007", as: "greenEgg" },
          hand: [{ card: "BT19-056", as: "mono" }],
          deck: ["BT1-010"],
        },
        1: { security: ["BT1-013"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const monoInstanceId = s.inst("mono").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenEgg").permanentId,
        instanceId: monoInstanceId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("greenEgg").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([monoInstanceId]);
    expect(s.state.memory).toBe(5);
  });

  it("inherited [All Turns] +1000 DP holds on a real host on BOTH turns, and not on a peer without it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-056", as: "host" },
            { card: "BT19-060", as: "peerNoMonodramon" },
          ],
          hand: [
            { card: "BT19-060", as: "strikedramon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-014", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const monoInstanceId = s.perm("host").topCard!.instanceId;
    s.state.memory = 5;

    // Build the stack for real: Monodramon -> Strikedramon (Black Lv.3 base, cost 2).
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("strikedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT19-060");

    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([monoInstanceId]);
    // Printed 5000 + inherited 1000 on our own turn.
    expect(s.perm("host").currentDP).toBe(6000);
    // Near-miss peer: the same Strikedramon with nothing under it stays at its printed DP.
    expect(s.perm("peerNoMonodramon").currentDP).toBe(5000);
    advance(s.engine).endMainPhaseIfOpen(0);

    // [All Turns], not [Your Turn]: still live inside the opponent's own open Main phase.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("peerNoMonodramon").currentDP).toBe(5000);
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
