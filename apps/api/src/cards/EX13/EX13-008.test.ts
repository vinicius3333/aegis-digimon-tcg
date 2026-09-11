import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-008.js";

const cardId = "EX13-008";

// Reveal fixtures.
//   ST1-04   — named "Dracomon": matches the text reference through its NAME.
//   BT20-044 — "Breakdramon": matches only through its printed inherited text
//              ("[Dracomon]/[Examon] in their text"), so it proves the reference reads
//              text fields and not just the name.
//   BT1-009  — "Monodramon": the near-match. It carries "dramon" but neither "Dracomon"
//              nor "Examon", so the filter must refuse it.
//   BT1-011  — "Agumon Expert": plain non-match, no dragon token at all.
const NAME_MATCH = "ST1-04";
const TEXT_ONLY_MATCH = "BT20-044";
const NEAR_MATCH = "BT1-009";
const NON_MATCH = "BT1-011";

describe("EX13-008 Dracomon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Dracomon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Dragon"],
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      effectText:
        "[Digivolve] [Bebydomon]: Cost 0 \n\n[When Moving] [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Dracomon] or [Examon] in its text among them to the hand. Return the rest to the bottom of the deck.",
      inheritedEffectText:
        "[End of Your Turn] This Digimon and any of your other Digimon may DNA digivolve into a Digimon card in the hand.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });

    // A bracketed bare [Name] is the exact reading, so the off-colour Bebydomon prints are
    // reachable while "Bebydomon"-adjacent names are not.
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Bebydomon"], cost: 0, isAlternate: true }]);

    // One sentence printed under two timings: two effects, identical action list, neither inherited.
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.isInherited).toBeUndefined();
      expect(effect.actions).toEqual([
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ]);
    }

    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "EndOfYourTurn",
      isInherited: true,
      actions: [
        {
          kind: "DnaDigivolve",
          materials: { filter: { controller: "mine", kind: ["Digimon"], includesSelf: true }, count: 2, isSelf: true },
          into: { controllerDefault: "mine", kind: ["Digimon"], zone: "hand" },
          payCost: true,
          optional: true,
        },
      ],
    });
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] [Bebydomon]: Cost 0 — additive to the printed Red Lv.2 evoCost.
  // ---------------------------------------------------------------------------

  it("digivolves from an off-colour [Bebydomon] for 0 and refuses a same-level green egg", async () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "EX13-005", as: "bebydomon" },
        hand: [{ card: cardId, as: "dracomon" }],
        deck: [{ card: NON_MATCH, as: "bonusDraw" }],
      },
    });
    legal.state.memory = 0;
    await legal.ready();

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("bebydomon").permanentId,
        instanceId: legal.inst("dracomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("bebydomon").topCard.cardId === cardId);

    // Cost 0, and the egg survives underneath as the single digivolution card.
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("bebydomon").stack.map(({ instanceId }) => instanceId)).toEqual([
      legal.inst("bebydomon").instanceId,
    ]);
    // Digivolution's bonus draw: the one deck card is now the only card in hand.
    expect(legal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      legal.inst("bonusDraw").instanceId,
    ]);
    expect(legal.state.players[0]!.deck).toHaveLength(0);

    const illegal = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "tanemon" },
        hand: [{ card: cardId, as: "dracomon" }],
        deck: [NON_MATCH],
      },
    });
    illegal.state.memory = 0;
    await illegal.ready();

    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("tanemon").permanentId,
        instanceId: illegal.inst("dracomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.perm("tanemon").topCard.cardId).toBe("BT1-007");
    expect(illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      illegal.inst("dracomon").instanceId,
    ]);
  });

  it("keeps the printed Red Lv.2 route available without the alternate cost", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        hand: [{ card: cardId, as: "dracomon" }],
        deck: [NON_MATCH],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redEgg").permanentId,
        instanceId: s.inst("dracomon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redEgg").topCard.cardId === cardId);
    expect(s.state.memory).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // [On Play] Reveal 3, add 1 [Dracomon]/[Examon]-in-text card, rest to deck bottom.
  // ---------------------------------------------------------------------------

  it("adds the text-only match on play and bottoms the near-match and the non-match", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "dracomon" }],
          deck: [
            { card: TEXT_ONLY_MATCH, as: "textMatch" },
            { card: NEAR_MATCH, as: "nearMatch" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: "BT1-012", as: "sentinel" },
          ],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"], deck: ["BT1-013"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === TEXT_ONLY_MATCH));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    // Only the text match reaches the hand; the near-match "Monodramon" is refused.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("textMatch").instanceId]);
    // The sentinel stays on top of the two returned cards, proving "bottom of the deck".
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("nearMatch").instanceId,
      s.inst("nonMatch").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("adds exactly one card when two revealed cards match the text reference", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "dracomon" }],
          deck: [
            { card: NAME_MATCH, as: "nameMatch" },
            { card: TEXT_ONLY_MATCH, as: "textMatch" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: "BT1-012", as: "sentinel" },
          ],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"], deck: ["BT1-013"] },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("nameMatch").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === NAME_MATCH));
    await settle(() => s.state.pendingDecision === undefined);

    // "Add 1 card" is singular: the second match is returned with the rest.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("nameMatch").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("textMatch").instanceId,
      s.inst("nonMatch").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("returns all three revealed cards when none carries either token", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "dracomon" }],
          deck: [
            { card: NEAR_MATCH, as: "nearMatch" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: "BT1-012", as: "thirdMiss" },
            { card: "BT1-013", as: "sentinel" },
          ],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"], deck: ["BT1-013"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("nearMatch").instanceId,
      s.inst("nonMatch").instanceId,
      s.inst("thirdMiss").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [When Moving] — the same clause on the public breeding-move route.
  // ---------------------------------------------------------------------------

  it("fires the same reveal clause when it moves out of breeding", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: cardId, as: "dracomon" },
          hand: [{ card: "BT1-014", as: "spare" }],
          deck: [
            { card: TEXT_ONLY_MATCH, as: "textMatch" },
            { card: NEAR_MATCH, as: "nearMatch" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: "BT1-012", as: "sentinel" },
          ],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"], deck: ["BT1-013"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("dracomon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === TEXT_ONLY_MATCH));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("spare").instanceId, s.inst("textMatch").instanceId]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("nearMatch").instanceId,
      s.inst("nonMatch").instanceId,
    ]);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // Inherited [End of Your Turn] DNA digivolve.
  // The smallest legal stack that reaches the clause: EX13-008 sits in the digivolution
  // cards of a battle-area Digimon, whose controller also has a second Digimon, and the
  // DNA destination (BT20-045 Examon, [Breakdramon] + [Slayerdramon]) is in hand.
  // ---------------------------------------------------------------------------

  it("DNA digivolves the host and another of your Digimon into the hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "breakdramon", under: [cardId, "BT12-022", "BT20-025"] },
            { card: "BT20-027", as: "slayerdramon", under: ["BT12-022", "BT20-025"] },
          ],
          hand: [{ card: "BT20-045", as: "examon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("breakdramon").permanentId;
    const partnerId = s.perm("slayerdramon").permanentId;

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("breakdramon"));
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT20-045") &&
        s.state.pendingDecision === undefined,
    );

    const examon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT20-045")!;
    // Both material permanents are consumed into the single DNA result, and both their
    // stacks survive beneath it — EX13-008 included.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([examon.permanentId]);
    expect(examon.permanentId).not.toBe(hostId);
    expect(examon.permanentId).not.toBe(partnerId);
    expect(examon.stack.map(({ cardId: id }) => id)).toEqual(
      expect.arrayContaining([cardId, "BT20-044", "BT20-027", "BT12-022", "BT20-025"]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not offer the DNA digivolution without a second Digimon of your own", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-044", as: "breakdramon", under: [cardId, "BT12-022", "BT20-025"] }],
          hand: [{ card: "BT20-045", as: "examon" }],
        },
        1: { battleArea: [{ card: "BT20-027", as: "opponentSlayerdramon", under: ["BT12-022", "BT20-025"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("breakdramon"));
    await settle(() => s.state.pendingDecision === undefined);

    // The opponent's Slayerdramon is not "your other Digimon", so nothing happens.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT20-044"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT20-027"]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("examon").instanceId]);
  });

  it("publicly declines the optional DNA digivolution and preserves both materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "breakdramon", under: [cardId, "BT12-022", "BT20-025"] },
            { card: "BT20-027", as: "slayerdramon", under: ["BT12-022", "BT20-025"] },
          ],
          hand: [{ card: "BT20-045", as: "examon" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014"], security: ["BT1-014"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await turn;

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("breakdramon").topCard.cardId).toBe("BT20-044");
    expect(s.perm("slayerdramon").topCard.cardId).toBe("BT20-027");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT20-045")).toBe(false);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("examon").instanceId);
  });

  it("does not grant the inherited DNA digivolution without EX13-008 in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "breakdramon", under: ["BT12-022", "BT20-025"] },
            { card: "BT20-027", as: "slayerdramon", under: ["BT12-022", "BT20-025"] },
          ],
          hand: [{ card: "BT20-045", as: "examon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("breakdramon"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT20-044", "BT20-027"]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("examon").instanceId]);
  });
});
