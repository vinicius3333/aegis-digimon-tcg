import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX13-046.js";

// Reveal fixtures, chosen so every axis of the two `add` slots is exercised:
//   BT8-106  Senbon Dokkan — Option, [Mamemon] only inside its printed effect text, NOT [Mutant].
//   BT12-058 Zenimon       — Digimon with the exact [Mutant] trait, no [Mamemon] anywhere.
//   BT8-061  Thundermon    — satisfies BOTH qualifiers ([Mutant] trait + [Mamemon] in its text).
//   BT12-071 AncientWisemon— near-miss: its trait is [Ancient Mutant], and no [Mamemon] at all.
//   BT1-009..BT1-014       — inert Digimon matching neither qualifier.
const inertDeck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];

describe("EX13-046 Kokuwamon", () => {
  it("matches the catalog and the complete IR contract", () => {
    expect(getCardDefinition("EX13-046")).toMatchObject({
      cardId: "EX13-046",
      set: "EX13",
      nameEn: "Kokuwamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Machine"],
      effectText:
        "[On Play] Reveal the top 3 cards of your deck. Add 1 card with [Mamemon] in its text and 1 card with the [Mutant] trait among them to the hand. Return the rest to the bottom of the deck.",
      inheritedEffectText: "[On Deletion] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. ",
    });

    expect(compiled.effects[0]).toEqual({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Mamemon"], match: "text" }],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Mutant"], match: "trait" }],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    });
    expect(compiled.effects[1]).toEqual({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
    });
    expect(compiled.effects).toHaveLength(2);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("reveals exactly 3, adds one [Mamemon]-text card and one [Mutant] card, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-046", as: "kokuwamon" }],
          deck: [
            { card: "BT8-106", as: "mamemonText" },
            { card: "BT12-058", as: "mutantTrait" },
            { card: "BT1-009", as: "nonMatch" },
            { card: "BT1-010", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kokuwamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("mamemonText").instanceId, s.inst("mutantTrait").instanceId]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("nonMatch").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX13-046"]);
    expect(s.state.memory).toBe(2);
    // Exactly the two printed add slots prompted, and nothing else.
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // "in its text" is comprehensive rules §4-22-1, so an Option whose only [Mamemon] mention
  // sits inside its printed effect text still matches. `match: "name"` would leave it in the
  // deck, and the slot prints no card kind, so a non-Digimon is legal here.
  it("adds an Option whose only [Mamemon] mention sits inside its effect text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-046", as: "kokuwamon" }],
          deck: [
            { card: "BT8-106", as: "mamemonText" },
            { card: "BT1-009", as: "firstRest" },
            { card: "BT1-010", as: "secondRest" },
            { card: "BT1-011", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kokuwamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("mamemonText").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  // "with the [Mutant] trait" is the exact-trait form: a matching trait, a near-matching
  // [Ancient Mutant] and a wholly unrelated trait are revealed together, and only the exact
  // match leaves the deck. `traitContains` here would wrongly add AncientWisemon.
  it("discriminates the exact [Mutant] trait from [Ancient Mutant] and from an unrelated trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-046", as: "kokuwamon" }],
          deck: [
            { card: "BT12-071", as: "nearMiss" },
            { card: "BT12-058", as: "exactMutant" },
            { card: "BT1-009", as: "unrelated" },
            { card: "BT1-010", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kokuwamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("exactMutant").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("nearMiss").instanceId,
      s.inst("unrelated").instanceId,
    ]);
    // Only the [Mutant] slot could fire: AncientWisemon prints no [Mamemon] either.
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  // The two slots are per qualifier, not a pooled union, but one card cannot fill both: the
  // first slot consumes Thundermon ([Mutant] trait AND [Mamemon] in its text), leaving the
  // second slot with nothing, so exactly one card reaches the hand.
  it("lets one card fill only the first slot when it satisfies both qualifiers", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-046", as: "kokuwamon" }],
          deck: [
            { card: "BT8-061", as: "bothQualifiers" },
            { card: "BT1-009", as: "firstRest" },
            { card: "BT1-010", as: "secondRest" },
            { card: "BT1-011", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kokuwamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bothQualifiers").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
  });

  it("returns all three revealed cards to the bottom when neither qualifier matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-046", as: "kokuwamon" }],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
        },
      },
      { autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kokuwamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves for 0 from a black level-2 Digi-Egg and rejects an off-color egg", async () => {
    const eligible = setupEngine({
      0: {
        breeding: { card: "BT2-005", as: "blackEgg" },
        hand: [{ card: "EX13-046", as: "kokuwamon" }],
        deck: inertDeck,
      },
    });
    eligible.state.memory = 0;
    await eligible.ready();

    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("blackEgg").permanentId,
        instanceId: eligible.inst("kokuwamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("blackEgg").topCard.instanceId === eligible.inst("kokuwamon").instanceId);

    // Digivolving is not playing, so the [On Play] reveal must stay silent: the only card that
    // reaches hand is the single digivolution bonus draw, and the deck loses exactly that card.
    expect(eligible.state.memory).toBe(0);
    expect(eligible.state.players[0]!.hand).toHaveLength(1);
    expect(eligible.state.players[0]!.hand[0]!.cardId).toBe(inertDeck[0]);
    expect(eligible.state.players[0]!.deck).toHaveLength(inertDeck.length - 1);
    expect(eligible.perm("blackEgg").stack.map(({ cardId }) => cardId)).toEqual(["BT2-005"]);
    expect(eligible.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);

    const ineligible = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        hand: [{ card: "EX13-046", as: "kokuwamon" }],
        deck: inertDeck,
      },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("redEgg").permanentId,
        instanceId: ineligible.inst("kokuwamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("keeps Kokuwamon as a source card after a black level-4 digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX13-046", as: "host" }],
        hand: [{ card: "BT3-067", as: "tankmon" }],
        deck: inertDeck,
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("tankmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("tankmon").instanceId);

    expect(s.perm("host").topCard.cardId).toBe("BT3-067");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX13-046"]);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([inertDeck[0]]);
  });

  it("de-digivolves the opposing attacker by 1 after the inherited host loses a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-056", as: "host", under: ["EX13-046"], suspended: true }],
          security: ["BT1-010"],
          deck: inertDeck,
        },
        1: {
          battleArea: [{ card: "BT3-067", as: "attacker", under: ["BT1-009"] }],
          deck: inertDeck,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle();

    // Numemon (3000 DP) loses to Tankmon (6000 DP); both its own card and the Kokuwamon
    // source card hit the trash, and the inherited [On Deletion] then trashes exactly the
    // attacker's top card, leaving its single source card as the new top.
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT2-056", "EX13-046"]);
    expect(s.perm("attacker").topCard.cardId).toBe("BT1-009");
    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT3-067"]);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // A 2-deep opponent stack whose upper source is itself level 4 pins the printed "1", not
  // merely "some": exactly the top card is trashed and both source cards stay put. With
  // `amount: 2` the promoted Blimpmon would be peeled too (the level-3 floor of
  // `peelStackTops` only stops a repeat once a level-3 card is on top).
  it("trashes exactly one card from the opponent's stack and spares the controller's own", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-056", as: "host", under: ["EX13-046"] },
            { card: "BT3-067", as: "ownStack", under: ["BT1-009"] },
          ],
          deck: inertDeck,
        },
        1: {
          battleArea: [{ card: "BT3-067", as: "opponentStack", under: ["BT1-010", "BT4-069"] }],
          deck: inertDeck,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[1]!.trash.length >= 1);
    await settle();

    expect(s.perm("opponentStack").topCard.cardId).toBe("BT4-069");
    expect(s.perm("opponentStack").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT3-067"]);
    // The controller's own stack is untouched.
    expect(s.perm("ownStack").topCard.cardId).toBe("BT3-067");
    expect(s.perm("ownStack").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does nothing on deletion when the opponent controls no Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-056", as: "host", under: ["EX13-046"] }],
          deck: inertDeck,
        },
        1: { deck: inertDeck },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT2-056", "EX13-046"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // The inherited line must not fire from the top card: Kokuwamon deleted while it is itself
  // the top card of a stack leaves the opponent's stack alone.
  it("does not fire from the top card of a stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-046", as: "host" }],
          deck: inertDeck,
        },
        1: {
          battleArea: [{ card: "BT3-067", as: "opponentStack", under: ["BT1-010"] }],
          deck: inertDeck,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle();

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX13-046"]);
    expect(s.perm("opponentStack").topCard.cardId).toBe("BT3-067");
    expect(s.perm("opponentStack").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
