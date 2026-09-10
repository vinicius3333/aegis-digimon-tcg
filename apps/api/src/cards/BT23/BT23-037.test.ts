import { describe, expect, it } from "vitest";
import { getCardDefinition, type CardDefinition, type Permanent } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import {
  assertNoLoudGap,
  settle,
  settleAcrossTimers,
  setupEngine,
  type CardSpec,
  type EngineSetup,
  type PermanentSpec,
  type SeatSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-037.js";

/** Seat 0's battle-area permanent whose top card is `instanceId`, or undefined. */
function permanentWithTop(s: EngineSetup, instanceId: string): Permanent | undefined {
  return s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === instanceId);
}

function definitionOf(cardId: string): CardDefinition {
  return getCardDefinition(cardId) as CardDefinition;
}

/** Printed text with the catalog's non-breaking spaces normalised, so a literal can match. */
function printedText(text: string | undefined): string {
  return (text ?? "").replaceAll("\u00a0", " ");
}

describe("BT23-037 Tentomon", () => {
  it("matches the printed catalog record and the compiled clauses", () => {
    expect(definitionOf("BT23-037")).toMatchObject({
      cardId: "BT23-037",
      nameEn: "Tentomon",
      colors: ["Green", "Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Yellow", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Insectoid", "Hudie", "CS"],
    });
    expect(printedText(definitionOf("BT23-037").effectText)).toBe(
      "[Digivolve] Lv.2 w/[CS] trait: Cost 0 \n\n[Your Turn] When this Digimon would digivolve into a Digimon card with the [CS] trait, reduce the digivolution cost by 1.",
    );
    expect(printedText(definitionOf("BT23-037").inheritedEffectText)).toBe(
      "[When Attacking] [Once Per Turn] You may play 1 play cost 5 or lower Digimon card with the [Hudie] trait from your hand without paying the cost. The Digimon this effect played can't digivolve and is deleted at the end of your opponent's turn.",
    );

    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
      actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
    });
    const inherited = compiled.effects.find((effect) => effect.isInherited === true);
    expect(inherited).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      abortOnDecline: true,
      bindResultAs: "playedHudie",
      target: {
        count: 1,
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          playCostLte: 5,
          nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }],
        },
      },
    });
    expect(inherited?.actions[1]).toMatchObject({
      kind: "Restrict",
      target: { filter: { boundRef: "playedHudie", kind: ["Digimon"] }, count: "all" },
      restriction: "digivolve",
      duration: "permanent",
    });
    expect(inherited?.actions[2]).toMatchObject({ kind: "DelayedDelete", timing: "endOfOpponentTurn" });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  // Q5299. The digivolve intent selects the cost path: without `useAlternateCost` the engine
  // prices the printed EvoCost, with it the printed [Digivolve] Lv.3 w/[CS] route. `BT23-020`
  // is off-colour, so only its alternate route matches either way. `BT1-051` is a same-colour
  // level-4 Digimon WITHOUT the [CS] trait: the printed condition, not the route, gates the
  // reduction. In the breeding area the reduction never applies.
  it.each([
    ["battle area, CS, ordinary route", "battleArea", "BT23-041", false, 1, 2],
    ["breeding, CS, ordinary route", "breeding", "BT23-041", false, 0, 3],
    ["battle area, CS, alternate route", "battleArea", "BT23-041", true, 1, 1],
    ["breeding, CS, alternate route", "breeding", "BT23-041", true, 0, 2],
    ["battle area, CS, alternate-only route", "battleArea", "BT23-020", false, 1, 1],
    ["breeding, CS, alternate-only route", "breeding", "BT23-020", false, 0, 2],
    ["battle area, non-CS target", "battleArea", "BT1-051", false, 0, 2],
  ] as const)(
    "reduces the CS digivolution cost by 1 only from the battle area: %s",
    async (_label, zone, into, useAlternateCost, expectedReduction, expectedCost) => {
      const s = setupEngine({
        0: {
          ...(zone === "battleArea"
            ? { battleArea: [{ card: "BT23-037", as: "tentomon" }] }
            : { breeding: { card: "BT23-037", as: "tentomon" } }),
          hand: [{ card: into, as: "into" }],
          deck: ["BT1-009", "BT1-011"],
        },
      });
      s.state.memory = 5;
      await s.ready();
      const tentomonId = s.inst("tentomon").instanceId;
      const intoId = s.inst("into").instanceId;

      expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("tentomon"), definitionOf(into))).toBe(
        expectedReduction,
      );
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("tentomon").permanentId,
          instanceId: intoId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("tentomon").topCard.instanceId === intoId);

      expect(s.state.memory).toBe(5 - expectedCost);
      expect(s.perm("tentomon").topCard.instanceId).toBe(intoId);
      expect(s.perm("tentomon").stack.map((card) => card.instanceId)).toEqual([tentomonId]);
      // One evolution bonus draw: the deck lost exactly its top card and the hand holds it.
      expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
      assertNoLoudGap(s);
    },
  );

  it("offers no CS reduction on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-037", as: "tentomon" }] } });
    await s.ready();
    expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("tentomon"), definitionOf("BT23-041"))).toBe(1);
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("tentomon"), definitionOf("BT23-041"))).toBe(0);
  });

  it("digivolves for 0 over a level-2 CS card and rejects a level-2 non-CS card", async () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "BT23-002", as: "base" },
        hand: [{ card: "BT23-037", as: "tentomon" }],
        deck: ["BT1-009", "BT1-011"],
      },
    });
    legal.state.memory = 3;
    await legal.ready();
    const baseId = legal.inst("base").instanceId;
    const tentomonId = legal.inst("tentomon").instanceId;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: tentomonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.instanceId === tentomonId);
    expect(legal.state.memory).toBe(3);
    expect(legal.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(legal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);

    const illegal = setupEngine({
      0: { breeding: { card: "BT1-001", as: "base" }, hand: [{ card: "BT23-037", as: "tentomon" }] },
    });
    illegal.state.memory = 3;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("tentomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT23-037"]);
    expect(illegal.state.memory).toBe(3);
  });

  // The inherited clause. `BT23-050` Ankylomon is a legal level-4 host over a level-3 [CS]
  // Tentomon, so the digivolution stack under test has a real public route.
  const inheritedBoard = (): { 0: SeatSpec & { battleArea: PermanentSpec[]; hand: CardSpec[] }; 1: SeatSpec } => ({
    0: {
      battleArea: [{ card: "BT23-050", as: "host", under: [{ card: "BT23-037", as: "tentomon" }] }],
      hand: [
        { card: "BT23-020", as: "eligible" },
        { card: "BT23-055", as: "tooExpensive" },
        { card: "BT1-009", as: "notHudie" },
        { card: "BT23-081", as: "hudieTamer" },
      ],
      trash: [{ card: "BT23-017", as: "trashHudie" }],
      deck: Array(8).fill("BT1-011"),
    },
    1: { security: Array(5).fill("BT1-011"), deck: Array(8).fill("BT1-012") },
  });

  const attackPlayer = (s: EngineSetup) =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    });

  it("plays only a hand Hudie Digimon of play cost 5 or lower when the host attacks", async () => {
    const s = setupEngine(inheritedBoard(), { autoAcceptOptional: true, autoSelectCards: true });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("eligible").instanceId) !== undefined);
    await settle(() => !observe(s.engine).isAttacking());

    const played = permanentWithTop(s, s.inst("eligible").instanceId);
    expect(played).toBeDefined();
    expect(played!.stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    // Every other candidate is refused: too expensive, no [Hudie] trait, a Tamer, or in trash.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("tooExpensive").instanceId, s.inst("notHudie").instanceId, s.inst("hudieTamer").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashHudie").instanceId);
    expect(observe(s.engine).isRestricted(played!, "digivolve")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("permanently blocks digivolution of the played Digimon while an untouched twin still digivolves", async () => {
    const board = inheritedBoard();
    const s = setupEngine(
      {
        ...board,
        0: {
          ...board[0],
          battleArea: [...board[0].battleArea, { card: "BT23-020", as: "control" }],
          hand: [...board[0].hand, { card: "BT23-055", as: "secondCyberdramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("eligible").instanceId) !== undefined);
    await settle(() => !observe(s.engine).isAttacking());
    const played = permanentWithTop(s, s.inst("eligible").instanceId)!;

    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: played.permanentId,
        instanceId: s.inst("tooExpensive").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(permanentWithTop(s, s.inst("eligible").instanceId)).toBeDefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tooExpensive").instanceId);
    expect(s.state.memory).toBe(8);

    // Same card, same route, a Seadramon this effect did not play: the block is bound to the
    // played instance, not to the card id.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("control").permanentId,
        instanceId: s.inst("secondCyberdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("control").topCard.instanceId === s.inst("secondCyberdramon").instanceId);
    expect(s.perm("control").stack.map((card) => card.instanceId)).toEqual([s.inst("control").instanceId]);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("caps the inherited play at once per turn and resets it on the next own turn", async () => {
    const board = inheritedBoard();
    const s = setupEngine(
      {
        ...board,
        0: {
          ...board[0],
          hand: [
            { card: "BT23-020", as: "eligible" },
            { card: "BT23-020", as: "secondEligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("eligible").instanceId) !== undefined);
    await settle(() => !observe(s.engine).isAttacking());
    expect(permanentWithTop(s, s.inst("eligible").instanceId)).toBeDefined();

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(permanentWithTop(s, s.inst("secondEligible").instanceId)).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondEligible").instanceId);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(permanentWithTop(s, s.inst("secondEligible").instanceId)).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("secondEligible").instanceId) !== undefined);
    expect(permanentWithTop(s, s.inst("secondEligible").instanceId)).toBeDefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays nothing and schedules no deletion when the controller declines", async () => {
    const s = setupEngine(inheritedBoard(), { autoDeclineOptional: true, autoSelectCards: true });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("host").permanentId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    // Nothing was played, so nothing is deleted and the host survives both boundaries.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("host").permanentId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("trashHudie").instanceId]);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("deletes the played Digimon at the end of the opponent's turn, not the controller's", async () => {
    const s = setupEngine(inheritedBoard(), { autoAcceptOptional: true, autoSelectCards: true });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("eligible").instanceId) !== undefined);
    await settle(() => !observe(s.engine).isAttacking());
    const playedId = permanentWithTop(s, s.inst("eligible").instanceId)!.permanentId;
    const playedCardId = s.inst("eligible").instanceId;
    const hostCardId = s.inst("host").instanceId;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === playedId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(playedCardId);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === playedId)).toBe(false);
    expect(s.state.players[0]!.trash.filter((card) => card.instanceId === playedCardId)).toHaveLength(1);
    // The host that carried the inherited effect is untouched, with its Tentomon source intact.
    expect(s.perm("host").topCard.instanceId).toBe(hostCardId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("tentomon").instanceId]);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5300: the newly played Digimon is a legal ＜Alliance＞ ally for the same attack.
  it("offers the newly played Digimon to a pending Alliance on the attacking host", async () => {
    const board = inheritedBoard();
    const s = setupEngine(
      {
        ...board,
        0: {
          ...board[0],
          battleArea: [{ card: "BT23-041", as: "host", dp: 6000, under: [{ card: "BT23-037", as: "tentomon" }] }],
          hand: [{ card: "BT23-050", as: "eligible" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("eligible").instanceId) !== undefined);
    const played = permanentWithTop(s, s.inst("eligible").instanceId)!;
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    const prompt = s.events.find((event) => event.kind === "alliancePrompt");
    expect(prompt).toBeDefined();
    expect((prompt as { eligibleAllyIds: string[] }).eligibleAllyIds).toContain(played.permanentId);

    const dpBeforeAlliance = s.perm("host").currentDP;
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: played.permanentId })).toEqual({
      ok: true,
    });
    const allyDP = played.currentDP;
    await settle(() => played.isSuspended);
    expect(played.isSuspended).toBe(true);
    expect(allyDP).toBe(5000);
    expect(dpBeforeAlliance).toBe(9000);
    await settle(() => !observe(s.engine).isAttacking());
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5300: the played Digimon may be chosen as the ＜Alliance＞ ally, and its DP is then added
  // to the attacking host for the battle. 6000 base + 3000 from BT23-041's own [When
  // Attacking] "for the turn" grant + the 5000-DP ally = 14000 during the battle. The
  // ＜Alliance＞ bonus is UntilEndBattle. Attacking hands memory to the opponent here, so the
  // turn ends with the attack and the post-attack board proves nothing about grant tiers;
  // BT23-041.test.ts "expires the grant at the turn boundary and triggers again on the next
  // turn" is where the "for the turn" survival is asserted.
  it("adds the played ally's DP to the attacking host", async () => {
    const board = inheritedBoard();
    // The ＜Alliance＞ DP exists only DURING the battle, so it is read from inside the engine's
    // own call stack (every emitted event) rather than after the attack has finished.
    let hostDpDuringBattle = 0;
    const s = setupEngine(
      {
        ...board,
        0: {
          ...board[0],
          battleArea: [{ card: "BT23-041", as: "host", dp: 6000, under: [{ card: "BT23-037", as: "tentomon" }] }],
          hand: [{ card: "BT23-050", as: "eligible" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent: () => {
          const host = s.state.players[0]?.battleArea.find((p) => p.permanentId === hostPermanentId);
          if (host !== undefined) hostDpDuringBattle = Math.max(hostDpDuringBattle, host.currentDP);
        },
      },
    );
    const hostPermanentId = s.perm("host").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("eligible").instanceId) !== undefined);
    const played = permanentWithTop(s, s.inst("eligible").instanceId)!;
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    const dpBeforeAlliance = s.perm("host").currentDP;
    const allyDP = played.currentDP;
    expect(dpBeforeAlliance).toBe(9000);
    expect(allyDP).toBe(5000);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: played.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(hostDpDuringBattle).toBe(dpBeforeAlliance + allyDP);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5565, both halves. The first half (the played Digimon IS deleted at the deletion timing)
  // is proved by the boundary test above. The second half needs a prevention to fire against
  // this card's own delayed deletion: BT23-073 Eater Bit prevents a [Hudie] ally from leaving
  // the battle area by deleting itself. Its printed text has no "opponent's effect" qualifier,
  // so the prevention also answers a deletion the controller's own card scheduled.
  // Q5565 answers that the prohibition is a lasting effect on the surviving Digimon: it is not
  // cleared by the prevented deletion.
  it("keeps the evolution prohibition when the deletion is prevented", async () => {
    const board = inheritedBoard();
    const s = setupEngine(
      {
        ...board,
        0: {
          ...board[0],
          battleArea: [...board[0].battleArea, { card: "BT23-073", as: "eaterBit" }],
        },
      },
      // `autoChooseOption` answers Eater Bit's alternative-cost prompt ("delete this Digimon"
      // or "place it under [Mother Eater]"); without it the prevention prompt stalls the
      // end-of-turn boundary and seat 0's Main phase never reopens.
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("eligible").instanceId) !== undefined);
    await settle(() => !observe(s.engine).isAttacking());
    const playedId = permanentWithTop(s, s.inst("eligible").instanceId)!.permanentId;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === playedId);
    expect(played).toBeDefined();
    expect(played!.topCard.instanceId).toBe(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("eligible").instanceId);
    // Eater Bit paid the prevention with itself: it left the battle area for the trash.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("eaterBit").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).not.toContain(
      s.inst("eaterBit").instanceId,
    );
    expect(observe(s.engine).isRestricted(played!, "digivolve")).toBe(true);
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: playedId,
        instanceId: s.inst("tooExpensive").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tooExpensive").instanceId);
    expect(played!.topCard.instanceId).toBe(s.inst("eligible").instanceId);
    expect(s.state.memory).toBe(8);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5566, part 1: the pending deletion and the opponent's [End of Your Turn] effect resolve
  // at the SAME boundary. BT23-036 BanchoLeomon grants ＜Raid＞ and attacks; the played Digimon
  // is still on the board when that attack picks its target, so ＜Raid＞ redirects onto it and
  // the security stack is untouched.
  it("resolves the deletion at the same end-of-turn boundary as the opponent's effect", async () => {
    const board = inheritedBoard();
    const s = setupEngine(
      {
        0: { ...board[0], security: Array(5).fill("BT1-011") },
        1: {
          battleArea: [{ card: "BT23-036", as: "bancho", dp: 13000 }],
          security: Array(5).fill("BT1-011"),
          deck: Array(8).fill("BT1-012"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("eligible").instanceId) !== undefined);
    await settle(() => !observe(s.engine).isAttacking());
    const playedId = permanentWithTop(s, s.inst("eligible").instanceId)!.permanentId;
    const playedCardId = s.inst("eligible").instanceId;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === playedId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    // The redirected attack reached the played Digimon, so no security card was checked.
    expect(
      s.decisions.some(
        (decision) =>
          decision.seat === 1 &&
          decision.req.kind === "selectCards" &&
          (decision.req.options?.candidateInstanceIds ?? []).includes(playedCardId),
      ),
    ).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === playedId)).toBe(false);
    expect(s.state.players[0]!.trash.filter((card) => card.instanceId === playedCardId)).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5566, part 2. The delayed deletion is pending processing scheduled by seat 0's card, and
  // BanchoLeomon's [End of Your Turn] is seat 1's System-A timing effect. They are simultaneous,
  // and the TURN PLAYER (seat 1) chooses the processing order across that controller boundary.
  // See docs/audits/BT23.md#end-turn-ordering.
  it("offers the turn player the end-of-turn processing order", async () => {
    const board = inheritedBoard();
    const s = setupEngine(
      {
        0: { ...board[0], security: Array(5).fill("BT1-011") },
        1: {
          battleArea: [{ card: "BT23-036", as: "bancho", dp: 13000 }],
          security: Array(5).fill("BT1-011"),
          deck: Array(8).fill("BT1-012"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("eligible").instanceId) !== undefined);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.pendingDecision?.kind === "orderTriggers");
    expect(s.decisions.some((decision) => decision.seat === 1 && decision.req.kind === "orderTriggers")).toBe(true);
    const pending = s.state.pendingDecision!;
    expect(pending.kind).toBe("orderTriggers");
    expect(pending.seat).toBe(1);
    expect((JSON.parse(pending.payloadJson) as { triggerKeys?: string[] }).triggerKeys ?? []).toHaveLength(2);

    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("tracks the once-per-turn cap per Tentomon copy, so two hosts each play one Hudie", async () => {
    const board = inheritedBoard();
    const s = setupEngine(
      {
        ...board,
        0: {
          ...board[0],
          battleArea: [
            { card: "BT23-050", as: "host", under: [{ card: "BT23-037", as: "tentomon" }] },
            { card: "BT23-050", as: "secondHost", under: [{ card: "BT23-037", as: "secondTentomon" }] },
          ],
          hand: [
            { card: "BT23-020", as: "eligible" },
            { card: "BT23-020", as: "secondEligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("eligible").instanceId) !== undefined);
    await settle(() => !observe(s.engine).isAttacking());
    expect(permanentWithTop(s, s.inst("eligible").instanceId)).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondHost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("secondEligible").instanceId) !== undefined);
    await settle(() => !observe(s.engine).isAttacking());
    expect(permanentWithTop(s, s.inst("secondEligible").instanceId)).toBeDefined();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
