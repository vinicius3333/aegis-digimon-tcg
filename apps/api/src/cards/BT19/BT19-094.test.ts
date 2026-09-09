import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-094 Seventh Divine Cruz — Yellow/Purple Option, play cost 7, [Seven Great Demon Lords].
//   [Trash] [Your Turn] When any of your Digimon digivolve into [Lucemon (X Antibody)], by
//     returning this card to the bottom of the deck, your opponent may trash their top security
//     card. If this effect didn't trash, ＜Recovery +1 (Deck)＞
//   [Main] Delete your opponent's Digimon until they have as many as the number of your security
//     cards. If this effect deleted, ＜Recovery +1 (Deck)＞.
//   [Security] You may play 1 [Lucemon] from your trash without paying the cost.
//
// Fixture vocabulary:
//   BT1-051 Reppamon      — inert mono-YELLOW Lv.4. Single-colour acceptance case.
//   BT2-067 DemiDevimon   — inert mono-PURPLE Lv.3. The other single-colour acceptance case.
//   BT1-038 Monzaemon     — inert mono-BLUE Lv.5. The off-colour refusal case.
//   BT7-111 Lucemon: Chaos Mode — Purple Lv.5 with [Lucemon] in its name: the legal source for
//                           BT19-043's printed alternate route "Lv.5 or higher w/[Lucemon] in
//                           its name: Cost 3" (its printed evoCosts are 6, so the memory delta
//                           discriminates the route). Also a [Security] NEAR MISS: its name is
//                           not the exact [Lucemon].
//   BT19-043 Lucemon (X Antibody) — the digivolution target the {Trash} watcher names.
//                           Also the second [Security] near miss (exact-name check).
//   BT18-034 Lucemon      — the exact-name [Lucemon] the [Security] effect may play (cost 10).
//                           Its [On Play] needs a hand card to pay with; seat 1 holds none, so
//                           the play is the only thing that happens.
//   BT1-009..BT1-013      — inert main-deck Digimon: deck/security padding and the opponent
//                           bodies the [Main] clause deletes. No Digi-Egg is seeded anywhere.

const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];

const boardCardIds = (s: EngineSetup, seat: 0 | 1): (string | undefined)[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId);

describe("BT19-094 Seventh Divine Cruz — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-094")).toMatchObject({
      cardId: "BT19-094",
      nameEn: "Seventh Divine Cruz",
      colors: ["Yellow", "Purple"],
      kinds: ["Option"],
      playCost: 7,
      dp: 0,
      evoCosts: [],
      types: ["Seven Great Demon Lords"],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT19-094")!;
    expect(printed.effectText).toContain(
      "[Trash] [Your Turn] When any of your Digimon digivolve into [Lucemon (X Antibody)], by returning " +
        "this card to the bottom of the deck, your opponent may trash their top security card. " +
        "If this effect didn't trash, ＜Recovery +1 (Deck)＞",
    );
    expect(printed.effectText).toContain(
      "[Main] Delete your opponent's Digimon until they have as many as the number of your security cards. " +
        "If this effect deleted, ＜Recovery +1 (Deck)＞.",
    );
    expect(printed.securityEffectText).toBe(
      "[Security] You may play 1 [Lucemon] from your trash without paying the cost.",
    );
  });

  it("compiles the three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-094");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "YourTurn",
        // Q5551: a {Trash} effect activates only while the card is in the trash.
        isFromTrash: true,
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOneOfYoursDigivolves",
            sourceFilter: {
              controllerDefault: "mine",
              // Bracketed exact name.
              nameOrTrait: [{ tokens: ["Lucemon (X Antibody)"], match: "nameExact" }],
            },
            actions: [
              {
                kind: "SecurityManipulation",
                op: "trashTop",
                controller: "opponent",
                // "your opponent MAY trash": the choice belongs to the opponent, not to me.
                optionalFor: "opponent",
                amount: 1,
                bindResultAs: "opponentSecurityTrashedBySeventh",
                cost: {
                  kind: "return",
                  target: {
                    filter: { zone: "trash", controller: "mine", isSelfRef: true },
                    count: 1,
                    isSelf: true,
                  },
                },
              },
              {
                // Q3167: the ＜Recovery +1 (Deck)＞ belongs to ME, not to the declining opponent.
                kind: "SecurityManipulation",
                op: "addTop",
                controller: "mine",
                source: "deck",
                amount: 1,
                condition: { kind: "bindingEmpty", ref: "opponentSecurityTrashedBySeventh" },
              },
            ],
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "DeleteUntilCount",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
            untilCountSource: "mineSecurityCount",
          },
          {
            kind: "SecurityManipulation",
            op: "addTop",
            controller: "mine",
            source: "deck",
            amount: 1,
            // Q3169: only a deletion BY THIS EFFECT satisfies "if this effect deleted".
            condition: { kind: "ifThisEffectActed" },
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                controller: "mine",
                // [Lucemon] is EXACT: "Lucemon: Chaos Mode" / "Lucemon (X Antibody)" must not match.
                nameOrTrait: [{ tokens: ["Lucemon"], match: "nameExact" }],
              },
              count: 1,
            },
            from: ["trash"],
            payCost: false,
            optional: true,
          },
        ],
      },
    ]);
  });
});

describe("BT19-094 Seventh Divine Cruz — use cost and the multicolour requirement", () => {
  function colourFixture(ownBoard: string[]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-094", as: "cruz" }, "BT1-009"],
          battleArea: ownBoard.map((card, index) => ({ card, as: `own${index}` })),
          deck: [...FILLER],
          security: ["BT1-009", "BT1-010"],
        },
        // No opponent Digimon: the [Main] clause has nothing to delete, so the play itself is
        // the only thing under test here.
        1: { deck: [...FILLER], security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    return s;
  }

  // CR 4-22-3: "An Option card with multiple colors can't be used unless the color
  // requirements are met for ALL of its colors." CR 4-22-4: one multicolor Digimon or Tamer
  // can meet several of them at once.
  for (const [label, board] of [
    ["an all-blue board", ["BT1-038"]],
    ["a yellow-only board — the purple half is unmet", ["BT1-051", "BT1-038"]],
    ["a purple-only board — the yellow half is unmet", ["BT2-067", "BT1-038"]],
  ] as const) {
    it(`refuses the play off ${label} (CR 4-22-3)`, async () => {
      const s = colourFixture([...board]);
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cruz").instanceId })).toEqual({
        ok: false,
        reason: "color-requirement-unmet",
      });
      expect(s.state.memory).toBe(10);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-094");
    });
  }

  it("accepts the play off one yellow and one purple permanent, charging the printed 7", async () => {
    const s = colourFixture(["BT1-051", "BT2-067"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cruz").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cruz").instanceId));
    expect(s.state.memory).toBe(3);
    // Nothing was deleted (the opponent has no Digimon), so no ＜Recovery +1 (Deck)＞ fired.
    expect(s.state.players[0]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("accepts the play off a SINGLE Purple/Yellow permanent, which meets both halves (CR 4-22-4)", async () => {
    // BT18-082 Lucemon: Chaos Mode is printed Purple/Yellow. Its own clauses are [On Play] /
    // [When Digivolving] / would-leave, so a seeded copy is inert here.
    const s = colourFixture(["BT18-082"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cruz").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cruz").instanceId));
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });
});

describe("BT19-094 Seventh Divine Cruz — [Main] delete until the security count", () => {
  function mainFixture(mySecurity: string[], opponentBoard: string[]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-094", as: "cruz" }, "BT1-009"],
          battleArea: [
            { card: "BT1-051", as: "colourYellow" },
            { card: "BT2-067", as: "colourPurple" },
          ],
          deck: [{ card: "BT1-013", as: "deckTop" }, ...FILLER],
          security: mySecurity.map((card, index) => ({ card, as: `sec${index}` })),
        },
        1: {
          battleArea: opponentBoard.map((card, index) => ({ card, as: `opp${index}` })),
          deck: [...FILLER],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    return s;
  }

  it("deletes down to my security count and then performs ＜Recovery +1 (Deck)＞", async () => {
    const s = mainFixture(["BT1-009", "BT1-010"], ["BT1-009", "BT1-010", "BT1-011", "BT1-012"]);
    await s.ready();
    const deckTopId = s.inst("deckTop").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cruz").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3);

    // 4 opponent Digimon, 2 of my security cards => exactly 2 deleted, 2 left standing.
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    // ＜Recovery +1 (Deck)＞: my deck's top card is now the top of my security stack.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)[0]).toBe(deckTopId);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).not.toContain(deckTopId);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("Q3168: with 0 security cards it deletes every opponent Digimon, then recovers 1", async () => {
    const s = mainFixture([], ["BT1-009", "BT1-010", "BT1-011"]);
    await s.ready();
    const deckTopId = s.inst("deckTop").instanceId;
    expect(s.state.players[0]!.security).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cruz").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(boardCardIds(s, 1)).toEqual([]);
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([deckTopId]);
    assertNoLoudGap(s);
  });

  it("deletes nothing — and so recovers nothing — when they already have at most my security count", async () => {
    const s = mainFixture(["BT1-009", "BT1-010", "BT1-011"], ["BT1-009", "BT1-010"]);
    await s.ready();
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cruz").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cruz").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    // "If this effect deleted" was not met, so the security stack is untouched.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(securityBefore);
    assertNoLoudGap(s);
  });
});

describe("BT19-094 Seventh Divine Cruz — {Trash} [Your Turn] on digivolution into [Lucemon (X Antibody)]", () => {
  /** `where` decides whether the copy of BT19-094 sits in the trash (live) or in hand (dead). */
  function digivolveFixture(where: "trash" | "hand", opts: { decline?: boolean }): EngineSetup {
    const cruz = { card: "BT19-094", as: "cruz" };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-111", as: "source" }],
          hand:
            where === "hand" ? [{ card: "BT19-043", as: "lucemonX" }, cruz] : [{ card: "BT19-043", as: "lucemonX" }],
          trash: where === "trash" ? [cruz] : [],
          // The digivolution bonus draw resolves BEFORE the {Trash} watcher, so it takes the
          // first card; `deckTop` is what ＜Recovery +1 (Deck)＞ can still reach.
          deck: [{ card: "BT1-012", as: "bonusDraw" }, { card: "BT1-013", as: "deckTop" }, ...FILLER],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          deck: [...FILLER],
          security: [
            { card: "BT1-009", as: "oppSecTop" },
            { card: "BT1-010", as: "oppSecSecond" },
            { card: "BT1-011", as: "oppSecThird" },
          ],
        },
      },
      opts.decline === true
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    return s;
  }

  const digivolve = (s: EngineSetup): unknown =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("source").permanentId,
      instanceId: s.inst("lucemonX").instanceId,
      useAlternateCost: true,
    });

  it("pays the return cost and lets the opponent trash their top security card", async () => {
    const s = digivolveFixture("trash", {});
    await s.ready();
    const cruzId = s.inst("cruz").instanceId;
    const memoryBefore = s.state.memory;

    expect(digivolve(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);

    // The printed alternate route cost 3 (the Lv.5 evoCosts are 6): the memory delta names it.
    expect(memoryBefore - s.state.memory).toBe(3);
    // Cost: this card left the trash and is at the BOTTOM of my deck.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(cruzId);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(cruzId);
    // Payload: their top security card is gone; the rest of their stack keeps its order.
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("oppSecSecond").instanceId,
      s.inst("oppSecThird").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("oppSecTop").instanceId);
    // It DID trash, so no ＜Recovery +1 (Deck)＞ for me.
    expect(s.state.players[0]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("Q3167: when the opponent declines, I am the player who performs ＜Recovery +1 (Deck)＞", async () => {
    const s = digivolveFixture("trash", { decline: true });
    await s.ready();
    const cruzId = s.inst("cruz").instanceId;
    const deckTopId = s.inst("deckTop").instanceId;

    expect(digivolve(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3);

    // Their security stack is untouched...
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("oppSecTop").instanceId,
      s.inst("oppSecSecond").instanceId,
      s.inst("oppSecThird").instanceId,
    ]);
    // ...and MY stack grew by my own deck's top card.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)[0]).toBe(deckTopId);
    expect(s.state.players[0]!.security).toHaveLength(3);
    // The cost was still paid: declining is the opponent's choice, not a way out of the cost.
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(cruzId);
    assertNoLoudGap(s);
  });

  it("Q5551: the same card in HAND does not activate — a {Trash} effect lives only in the trash", async () => {
    const s = digivolveFixture("hand", {});
    await s.ready();
    const cruzId = s.inst("cruz").instanceId;

    expect(digivolve(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-043"));

    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(cruzId);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).not.toBe(cruzId);
    assertNoLoudGap(s);
  });
});

describe("BT19-094 Seventh Divine Cruz — [Security]", () => {
  /** Seat 1 defends with BT19-094 on top of security; `trash` is what its effect may play. */
  function securityFixture(trash: string[]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "attacker" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          hand: [],
          trash: trash.map((card, index) => ({ card, as: `trash${index}` })),
          deck: [...FILLER],
          security: [{ card: "BT19-094", as: "flip" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    return s;
  }

  const attack = (s: EngineSetup): unknown =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });

  it("plays the exact-name [Lucemon] from the trash for free, never the two same-family near misses", async () => {
    const s = securityFixture(["BT19-043", "BT7-111", "BT18-034"]);
    await s.ready();

    expect(attack(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(boardCardIds(s, 1)).toEqual(["BT18-034"]);
    expect(s.state.players[1]!.battleArea[0]!.topCard!.instanceId).toBe(s.inst("trash2").instanceId);
    // "without paying the cost": BT18-034's printed play cost is 10 and no such payment happened.
    expect(getCardDefinition("BT18-034")!.playCost).toBe(10);
    expect(s.state.memory).toBeGreaterThan(-10);
    // The near misses stayed in the trash.
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT19-043", "BT7-111", "BT19-094"]),
    );
    assertNoLoudGap(s);
  });

  it("plays nothing when the trash holds only [Lucemon (X Antibody)] and [Lucemon: Chaos Mode]", async () => {
    const s = securityFixture(["BT19-043", "BT7-111"]);
    await s.ready();

    expect(attack(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-094"));

    expect(boardCardIds(s, 1)).toEqual([]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(
      ["BT19-043", "BT19-094", "BT7-111"].sort(),
    );
    assertNoLoudGap(s);
  });
});
