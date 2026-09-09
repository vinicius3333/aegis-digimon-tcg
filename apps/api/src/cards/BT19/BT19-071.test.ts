import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./BT19-071.js";

// Inert main-deck Digimon only: no Digi-Egg may sit in a deck or in security, and the
// numeric `security: n` form is forbidden.
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

describe("BT19-071 Beelzemon", () => {
  it("matches the catalog print this audit reads from", () => {
    expect(getCardDefinition("BT19-071")).toMatchObject({
      cardId: "BT19-071",
      nameEn: "Beelzemon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Seven Great Demon Lords"],
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 3 }],
      effectText:
        "[On Play] [When Digivolving] Trash the top 2 cards of your deck. Then, this Digimon gains ＜Blocker＞until the end of your opponent's turn.\n" +
        "[All Turns] [Once Per Turn] When effects trashes cards from your deck, delete 1 of your opponent's level 5 or lower Digimon.",
    });
    expect(getCardDefinition("BT19-071")?.inheritedEffectText).toBeUndefined();
  });

  it("compiles both play timings and the once-per-turn own-deck mill watcher", () => {
    const card = runtimeCompiledCard("BT19-071");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(card?.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashTopDeck", controller: "mine", amount: 2 },
          {
            kind: "GainKeyword",
            target: { filter: { isSelfRef: true }, isSelf: true },
            keyword: { keyword: "Blocker" },
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
    expect(card?.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDiscardLibrary",
          // "your deck": the watcher must ignore a mill of the opponent's deck.
          sourceFilter: { controller: "mine" },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });

  it("[On Play] mills exactly two, gains ＜Blocker＞, and deletes only an opponent Lv5-or-lower", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-071", as: "beelzemon" },
            { card: "BT1-009", as: "spare" },
          ],
          // Only my own Lv5 peer: the delete filter is opponent-scoped.
          battleArea: [{ card: "BT12-079", as: "myLv5" }],
          deck: [{ card: "BT1-013", as: "milledTop" }, { card: "BT1-009", as: "milledSecond" }, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT3-085", as: "theirLv5" },
            // Near-miss peer: same colour and type family, one level too high.
            { card: "BT3-089", as: "theirLv6" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelzemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.state.memory).toBe(-1); // play cost 11 paid from 10
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("milledTop").instanceId,
      s.inst("milledSecond").instanceId,
    ]);
    expect(observe(s.engine).hasKeyword(s.perm("beelzemon"), "Blocker")).toBe(true);
    // Exactly the opponent's Lv5 left; the Lv6 peer and my own Lv5 are untouched.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT3-089"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT3-085"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(
      ["BT12-079", "BT19-071"].sort(),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Digivolving] runs the same clause off a real Purple Lv5 stack for 3 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-071", as: "beelzemon" },
            { card: "BT1-009", as: "spare" },
          ],
          battleArea: [{ card: "BT3-085", as: "base", under: ["BT3-076", "BT3-083"] }],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "BT1-013", as: "milledTop" },
            { card: "BT1-009", as: "milledSecond" },
            ...FILLER,
          ],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT3-085", as: "theirLv5" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(s.state.memory).toBe(7); // Purple Lv5 evolution cost 3
    expect(s.perm("base").topCard?.cardId).toBe("BT19-071");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT3-076", "BT3-083", "BT3-085"]);
    expect(s.perm("base").stack.at(-1)?.instanceId).toBe(baseInstanceId);
    // The digivolution draw resolves first, then the effect mills the next two.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("spare").instanceId, s.inst("drawn").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("milledTop").instanceId,
      s.inst("milledSecond").instanceId,
    ]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal digivolution source (Lv4 Purple, off-colour Lv5)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT19-071", as: "beelzemon" }],
        battleArea: [
          { card: "BT4-080", as: "purpleLv4" },
          { card: "BT1-020", as: "redLv5" },
        ],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    });
    s.state.memory = 10;
    await s.ready();

    for (const alias of ["purpleLv4", "redLv5"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: s.inst("beelzemon").instanceId,
        }),
      ).not.toEqual({ ok: true });
    }

    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("beelzemon").instanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(
      ["BT1-020", "BT4-080"].sort(),
    );
  });

  it("deletes once per turn only, and again on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-071", as: "beelzemon" },
            { card: "P-017", as: "millerOne" },
            { card: "P-017", as: "millerTwo" },
            { card: "BT1-009", as: "spare" },
          ],
          battleArea: [{ card: "BT3-085", as: "base", under: ["BT3-076"] }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT3-085", as: "firstLv5" },
            { card: "BT12-079", as: "secondLv5" },
            { card: "BT10-079", as: "thirdLv5" },
          ],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    // First mill of the turn: the [When Digivolving] clause deletes one Lv5.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    // Second mill of the SAME turn, from an unrelated card: the watcher is spent.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("millerOne").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "P-017"));
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    // Back on my own turn the once-per-turn allowance is fresh.
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("millerTwo").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps ＜Blocker＞ through the opponent's whole turn and loses it afterwards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-071", as: "beelzemon" },
            { card: "BT1-009", as: "spare" },
          ],
          battleArea: [{ card: "BT3-085", as: "base", under: ["BT3-076"] }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT3-085", as: "theirLv5" }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-071");
    await settle();
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
