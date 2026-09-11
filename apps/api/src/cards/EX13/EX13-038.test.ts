import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-038.js";
// BT13-048 Salamon is this card's earlier printing; its inherited aura pays +2000 DP to a host
// carrying [Beast], [Animal] or [Sovereign], which makes it the cross-card reader for the
// [Rule] Trait grant below. Card modules register on import, and a per-card test only loads its
// own (the `_a3/revealAdd-cluster.test.ts` side-effect-import precedent).
import "../BT13/BT13-048.js";

// Reveal fixtures, chosen so every axis of both `add` slots is exercised:
//   BT3-030  Leopardmon  — Digimon, [Leopardmon] as its NAME (slot 1).
//   BT13-107 Vulcan Crusher — OPTION, [Leopardmon] only inside its printed text (slot 1, and the
//            proof that slot 1 carries no card-kind gate).
//   BT9-057  Bearmon     — [Beast] exactly (slot 2).
//   BT1-050  Liollmon    — [Holy Beast]: a SUBSTRING-only [Beast] match (slot 2).
//   BT4-082  Dobermon    — [Dark Animal]: a substring-only [Animal] match (slot 2).
//   BT8-019  Zhuqiaomon  — [Four Sovereigns]: a substring-only [Sovereign] match (slot 2).
//   BT1-033  Dolphmon    — [Sea Animal]: the near-match the printed exclusion must reject.
//   BT1-010  Agumon      — [Reptile]: the plain non-match.
//   BT1-009..BT1-014     — inert Digimon used as neutral deck/board filler.
const inertDeck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];

describe("EX13-038 Salamon", () => {
  it("matches the catalog and the complete IR contract", () => {
    expect(getCardDefinition("EX13-038")).toMatchObject({
      cardId: "EX13-038",
      set: "EX13",
      nameEn: "Salamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mammal"],
      effectText:
        "[On Play] Reveal the top 3 cards of your deck. Add 1 card with [Leopardmon] in its text and 1 Digimon card with [Beast], [Animal] or [Sovereign], other than [Sea Animal], in any of its traits among them to the hand. Return the rest to the bottom of the deck.\n[Rule] Trait: Has [Beast] Type.",
      inheritedEffectText: "[All Turns] All of your suspended Digimon get +1000 DP.",
    });
    expect(getCardDefinition("EX13-038")?.securityEffectText).toBeUndefined();

    expect(compiled.effects[0]).toEqual({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              // No `kind`: the printed noun is "1 card", so any card kind qualifies.
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Leopardmon"], match: "text" }],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                or: [
                  { nameOrTrait: [{ tokens: ["Beast", "Sovereign"], match: "traitContains" }] },
                  {
                    nameOrTrait: [{ tokens: ["Animal"], match: "traitContains" }],
                    excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
          raw: expect.any(String),
        },
      ],
    });
    expect(compiled.effects[1]).toEqual({
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Beast"],
        },
      ],
    });
    expect(compiled.effects[2]).toEqual({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { controller: "mine", kind: ["Digimon"], suspended: true }, count: "all" },
          effect: { kind: "modifyDP", amount: 1000 },
          raw: expect.any(String),
        },
      ],
    });
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects.some((effect) => effect.isSecurity === true)).toBe(false);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("reveals exactly 3, adds one Leopardmon-text card and one trait Digimon, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-038", as: "salamon" }],
          deck: [
            { card: "BT3-030", as: "leopardmon" },
            { card: "BT9-057", as: "bearmon" },
            { card: "BT1-010", as: "nonMatch" },
            { card: "BT1-011", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("leopardmon").instanceId, s.inst("bearmon").instanceId]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("nonMatch").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX13-038"]);
    expect(s.state.memory).toBe(2);
    // Exactly the two printed add slots prompted, and nothing else.
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(2);
  });

  // "1 card", not "1 Digimon card": slot 1 has no kind gate, so an Option naming [Leopardmon]
  // only inside its printed text qualifies. `match: "name"` would leave it in the deck.
  it("adds an Option whose only [Leopardmon] mention sits inside its printed text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-038", as: "salamon" }],
          deck: [
            { card: "BT13-107", as: "optionMatch" },
            { card: "BT1-010", as: "firstRest" },
            { card: "BT1-011", as: "secondRest" },
            { card: "BT1-012", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("optionMatch").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
  });

  // The trait filter must discriminate, not merely fire: a substring [Beast] match is taken, the
  // [Sea Animal] near-match is refused by the printed exclusion, and [Reptile] never matches.
  it("takes a [Holy Beast] Digimon while refusing [Sea Animal] and [Reptile]", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-038", as: "salamon" }],
          deck: [
            { card: "BT1-033", as: "seaAnimal" },
            { card: "BT1-050", as: "holyBeast" },
            { card: "BT1-010", as: "reptile" },
            { card: "BT1-011", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("holyBeast").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("seaAnimal").instanceId,
      s.inst("reptile").instanceId,
    ]);
    // Slot 1 found no [Leopardmon] card, so only one selection was offered.
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  // [Sea Animal] contains the [Animal] token, so it is the one candidate that proves the printed
  // exclusion does work: with no other trait match revealed, nothing is added at all.
  it("adds nothing when the only trait candidate is [Sea Animal]", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-038", as: "salamon" }],
          deck: [
            { card: "BT1-033", as: "seaAnimal" },
            { card: "BT1-010", as: "reptile" },
            { card: "BT1-012", as: "bird" },
            { card: "BT1-011", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("seaAnimal").instanceId,
      s.inst("reptile").instanceId,
      s.inst("bird").instanceId,
    ]);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  });

  // [Dark Animal] is an [Animal] substring match that is NOT [Sea Animal], so the exclusion must
  // not swallow it; [Four Sovereigns] is the substring proof for the third printed token.
  it("takes a [Dark Animal] Digimon and, separately, a [Four Sovereigns] Digimon", async () => {
    for (const alias of ["BT4-082", "BT8-019"]) {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "EX13-038", as: "salamon" }],
            deck: [
              { card: alias, as: "traitMatch" },
              { card: "BT1-033", as: "seaAnimal" },
              { card: "BT1-010", as: "reptile" },
              { card: "BT1-011", as: "unrevealed" },
            ],
          },
        },
        { autoSelectCards: true, autoOrderCards: true },
      );
      s.state.memory = 5;
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));

      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("traitMatch").instanceId]);
      expect(s.state.players[0]!.deck).toHaveLength(3);
    }
  });

  // The two slots are per category, not a pooled union: two revealed trait Digimon still yield
  // one added card, because slot 1 only accepts a [Leopardmon]-text card.
  it("takes only one card when both candidates match the trait slot", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-038", as: "salamon" }],
          deck: [
            { card: "BT9-057", as: "bearmon" },
            { card: "BT1-050", as: "liollmon" },
            { card: "BT1-010", as: "rest" },
            { card: "BT1-011", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect([s.inst("bearmon").instanceId, s.inst("liollmon").instanceId]).toContain(
      s.state.players[0]!.hand[0]!.instanceId,
    );
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("returns all three revealed cards to the bottom when neither slot matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-038", as: "salamon" }],
          deck: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
            { card: "BT1-012", as: "third" },
          ],
        },
      },
      { autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  });

  // [Rule] Trait: the catalog prints only [Mammal], so every [Beast] read must come from the
  // printed Rule clause. That clause is honoured engine-side by `staticTraitsOf`
  // (`engine/cards/cardData.ts:299`), which parses it straight out of `effectText`, so this test
  // proves the printed behaviour but cannot discriminate the card's own declarative `GrantStatic`
  // entry (mutation-confirmed: deleting that IR effect keeps this test green).
  // The cross-card half uses BT13-048 Salamon's inherited aura, which pays +2000 DP to a
  // host carrying [Beast], [Animal] or [Sovereign] — it sees the granted trait, a plain
  // [Reptile] host does not, and a Digimon merely carrying EX13-038 as a source card is not
  // granted anything.
  it("gains the [Beast] trait from its Rule clause and is read as [Beast] by another card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX13-038", as: "salamon" },
          { card: "BT1-010", as: "sourceOnly", under: ["EX13-038"] },
        ],
      },
    });
    await s.ready();

    expect(getCardDefinition("EX13-038")?.types).toEqual(["Mammal"]);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("salamon"), "Beast")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("salamon"), "Mammal")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("sourceOnly"), "Beast")).toBe(false);

    const crossCard = setupEngine({
      0: {
        battleArea: [
          { card: "EX13-038", as: "granted", under: ["BT13-048"] },
          { card: "BT1-010", as: "reptile", under: ["BT13-048"] },
        ],
      },
    });
    await crossCard.ready();
    expect(crossCard.perm("granted").currentDP).toBe(4000);
    expect(crossCard.perm("reptile").currentDP).toBe(2000);
  });

  it("pays the inherited +1000 DP to every own suspended Digimon and to nobody else", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "host", under: ["EX13-038"], suspended: true },
          { card: "BT1-012", as: "otherSuspended", suspended: true },
          { card: "BT1-013", as: "unsuspended" },
        ],
      },
      1: { battleArea: [{ card: "BT1-010", as: "theirSuspended", suspended: true }] },
    });
    await s.ready();

    // The host is itself one of "your suspended Digimon" (nothing printed excludes it).
    expect(s.perm("host").currentDP).toBe(2000 + 1000);
    expect(s.perm("otherSuspended").currentDP).toBe(2000 + 1000);
    expect(s.perm("unsuspended").currentDP).toBe(5000);
    expect(s.perm("theirSuspended").currentDP).toBe(2000);
  });

  // The aura is worth exactly +1000 in a real battle: a 2500 DP attacker loses to the suspended
  // 2000 DP host, and a 3500 DP attacker still beats it.
  it("wins a battle on the inherited bonus and still loses to an attacker above it", async () => {
    const survives = setupEngine({
      0: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 2500 }] },
      1: {
        battleArea: [{ card: "BT1-010", as: "host", under: ["EX13-038"], suspended: true }],
        security: ["BT1-011"],
      },
    });
    await survives.ready();
    expect(survives.perm("host").currentDP).toBe(3000);

    expect(
      survives.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: survives.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: survives.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => survives.events.some((event) => event.kind === "combatResolved"));

    expect(survives.state.players[1]!.battleArea).toHaveLength(1);
    expect(survives.state.players[0]!.battleArea).toHaveLength(0);
    expect(survives.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);

    const dies = setupEngine({
      0: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 3500 }] },
      1: {
        battleArea: [{ card: "BT1-010", as: "host", under: ["EX13-038"], suspended: true }],
        security: ["BT1-011"],
      },
    });
    await dies.ready();

    expect(
      dies.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: dies.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: dies.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => dies.events.some((event) => event.kind === "combatResolved"));

    expect(dies.state.players[1]!.battleArea).toHaveLength(0);
    expect(dies.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "EX13-038"]),
    );
    expect(dies.state.players[0]!.battleArea).toHaveLength(1);
  });

  // The recipient set is re-evaluated continuously, so the bonus lapses the moment the Digimon
  // unsuspends at the start of its controller's turn.
  it("drops the inherited bonus when the Digimon unsuspends through the real turn loop", async () => {
    // The host sits on seat 1 so that the loop's first turn (seat 0) leaves it suspended: a
    // Digimon unsuspends at the start of ITS controller's turn, which is the transition asserted
    // at the end.
    const s = setupEngine({
      0: { hand: [{ card: "BT1-009", as: "spare" }], deck: inertDeck },
      1: {
        battleArea: [{ card: "BT1-010", as: "host", under: ["EX13-038"], suspended: true }],
        hand: [{ card: "BT1-009", as: "theirSpare" }],
        deck: inertDeck,
      },
    });
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Suspended on the opponent's turn: the bonus is [All Turns], so it applies here too.
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").currentDP).toBe(3000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").currentDP).toBe(2000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves for 0 from a green level-2 Digi-Egg and rejects an off-color egg", async () => {
    const eligible = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "greenEgg" },
        hand: [{ card: "EX13-038", as: "salamon" }],
        deck: inertDeck,
      },
    });
    eligible.state.memory = 0;
    await eligible.ready();

    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("greenEgg").permanentId,
        instanceId: eligible.inst("salamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("greenEgg").topCard.instanceId === eligible.inst("salamon").instanceId);

    // Digivolving is not playing, so the [On Play] reveal stays silent: the only card reaching
    // hand is the single digivolution bonus draw.
    expect(eligible.state.memory).toBe(0);
    expect(eligible.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([inertDeck[0]]);
    expect(eligible.state.players[0]!.deck).toHaveLength(inertDeck.length - 1);
    expect(eligible.perm("greenEgg").stack.map(({ cardId }) => cardId)).toEqual(["BT1-007"]);
    expect(eligible.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);

    const ineligible = setupEngine({
      0: {
        breeding: { card: "BT2-005", as: "blackEgg" },
        hand: [{ card: "EX13-038", as: "salamon" }],
        deck: inertDeck,
      },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("blackEgg").permanentId,
        instanceId: ineligible.inst("salamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("keeps Salamon as a source card and its inherited aura live after a level-4 digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX13-038", as: "salamon" },
          { card: "BT1-011", as: "ally", suspended: true },
        ],
        hand: [{ card: "BT1-071", as: "vegiemon" }],
        deck: inertDeck,
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("salamon").permanentId,
        instanceId: s.inst("vegiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("salamon").topCard.instanceId === s.inst("vegiemon").instanceId);

    expect(s.perm("salamon").topCard.cardId).toBe("BT1-071");
    expect(s.perm("salamon").stack.map(({ cardId }) => cardId)).toEqual(["EX13-038"]);
    expect(s.state.memory).toBe(4);
    // The inherited aura now comes from the source card, and the [Beast] Rule grant is gone with
    // the printed top card that carried it.
    expect(s.perm("ally").currentDP).toBe(1000 + 1000);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("salamon"), "Beast")).toBe(false);
  });
});
