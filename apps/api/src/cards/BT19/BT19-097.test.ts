import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-097 Bonds of True Love — PURPLE Option, use cost 3.
//   When this card is trashed from the deck, you may place this card in the battle area.
//   [Main] Trash the top 2 cards of your deck. Then, place this card in the battle area.
//   [Start of Your Turn] If you don't have a Digimon, ＜Delay＞
//     ・ You may play 1 [Impmon] from your trash without paying the cost.
//   [Security] Place this card in the battle area.
//
// KB Q6244 (2026-05-08): the "when this card is trashed from the deck" effect activates ONLY
// when the card is trashed DIRECTLY from the deck — never when it is merely revealed from the
// deck, or looked at while searching.
//
// Fixture vocabulary:
//   BT2-068 Impmon — Purple Lv.3, [On Deletion] only (silent while it sits in the trash and
//     while it is played): the exact-name ＜Delay＞ payload target.
//   BT12-073 Impmon (X Antibody) — the NAME near-miss: "Impmon" is a substring of its name,
//     but the printed reference is the bracketed exact [Impmon].
//   BT2-067 DemiDevimon — inert PURPLE Lv.3 Digimon: the CR 4-22-2 colour source.
//   BT1-064 Goblimon — inert GREEN Lv.3 Digimon: the wrong-colour control.
//   BT1-009 / BT1-013 / BT1-012 / BT1-014 — inert RED main-deck Digimon padding. No Digi-Egg
//     is seeded in any deck or security stack.

const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014"];

const boardCardIds = (s: EngineSetup, seat: 0 | 1 = 0): (string | undefined)[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort();

describe("BT19-097 Bonds of True Love — catalog and IR", () => {
  it("matches the catalog record", () => {
    expect(getCardDefinition("BT19-097")).toMatchObject({
      cardId: "BT19-097",
      nameEn: "Bonds of True Love",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 3,
      maxCountInDeck: 4,
      securityEffectText: "[Security] Place this card in the battle area.",
    });
  });

  it("compiles the four printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-097");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenTrashedFromDeck",
            // "when THIS card is trashed": the watcher only answers for its own card.
            sourceFilter: { isSelfRef: true },
            actions: [{ kind: "PlaceInBattleAreaSelf" }],
            optional: true,
          },
        ],
      },
      {
        trigger: "Main",
        actions: [{ kind: "TrashTopDeck", controller: "mine", amount: 2 }, { kind: "PlaceInBattleAreaSelf" }],
      },
      {
        trigger: "StartOfYourTurn",
        condition: { kind: "youHaveNone", filter: { controllerDefault: "mine", kind: ["Digimon"] } },
        // ＜Delay＞ lives on the TRIGGER, which is what wires the intrinsic §16-17 trash cost
        // and entry-turn guard; a GainKeyword(Delay) action would be the dead shape.
        keywords: [{ keyword: "Delay" }],
        actions: [
          {
            kind: "PlayWithoutCost",
            // Bracketed [Impmon] is an EXACT-name reference.
            target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Impmon"], match: "nameExact" }] } },
            from: ["trash"],
            payCost: false,
            optional: true,
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlaceInBattleAreaSelf" }] },
    ]);
  });
});

describe("BT19-097 Bonds of True Love — use cost and the Purple colour requirement", () => {
  it("costs 3 memory off a purple permanent, mills exactly 2 and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-097", as: "bonds" }],
          battleArea: [{ card: "BT2-067", as: "purple", dp: 3000 }],
          deck: [
            { card: "BT1-009", as: "mill0" },
            { card: "BT1-013", as: "mill1" },
            { card: "BT1-012", as: "keep" },
          ],
          security: [...inertSecurity],
        },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bonds").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.memory).toBe(0);
    // Exactly the top two cards left the deck, by instance id; the third stayed.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("mill0").instanceId, s.inst("mill1").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("keep").instanceId]);
    // "Then, place this card in the battle area" — it is a permanent, not trashed.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId).sort()).toEqual(
      [s.inst("purple").instanceId, s.inst("bonds").instanceId].sort(),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the play with only a GREEN permanent on the board (CR 4-22-2)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-097", as: "bonds" }],
          battleArea: [{ card: "BT1-064", as: "green", dp: 3000 }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bonds").instanceId })).toMatchObject({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonds").instanceId]);
  });
});

describe("BT19-097 Bonds of True Love — when this card is trashed from the deck", () => {
  /** One copy is played from hand; its own mill trashes a SECOND copy out of the deck. */
  const millBoard = (deckTop: string) => ({
    0: {
      hand: [{ card: "BT19-097", as: "bonds" }],
      battleArea: [{ card: "BT2-067", as: "purple", dp: 3000 }],
      deck: [
        { card: deckTop, as: "milled" },
        { card: "BT1-013", as: "mill1" },
        { card: "BT1-012", as: "keep" },
      ],
      security: [...inertSecurity],
    },
    1: { deck: [...inertDeck], security: [...inertSecurity] },
  });

  it("places the milled copy in the battle area when it is trashed DIRECTLY from the deck", async () => {
    const s = setupEngine(millBoard("BT19-097"), { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bonds").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    // Both copies are on the board: the played one via [Main], the milled one via its own
    // "trashed from the deck" clause, pinned by instance id.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId).sort()).toEqual(
      [s.inst("purple").instanceId, s.inst("bonds").instanceId, s.inst("milled").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("mill1").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the optional leaves the milled copy in the trash", async () => {
    const s = setupEngine(millBoard("BT19-097"), { autoDeclineOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bonds").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("milled").instanceId, s.inst("mill1").instanceId].sort(),
    );
    expect(boardCardIds(s)).toEqual(["BT19-097", "BT2-067"]);
  });

  it("a DIFFERENT card milled from the deck does not place anything: the watcher is self-scoped", async () => {
    const s = setupEngine(millBoard("BT1-009"), { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bonds").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    // FAILS-WHEN-REVERTED (`sourceFilter.isSelfRef`): a watcher matching any milled card would
    // try to place BT1-009.
    expect(boardCardIds(s)).toEqual(["BT19-097", "BT2-067"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("milled").instanceId, s.inst("mill1").instanceId].sort(),
    );
  });

  it("KB Q6244: a copy trashed from the HAND, not the deck, never places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-097", as: "bonds" },
            { card: "BT19-097", as: "spare" },
          ],
          battleArea: [{ card: "BT2-067", as: "purple", dp: 3000 }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: { deck: [...inertDeck], security: [...inertSecurity] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bonds").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    // The second copy is still in hand, untouched: only a DIRECT deck trash arms the clause.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(boardCardIds(s)).toEqual(["BT19-097", "BT2-067"]);
  });
});

describe("BT19-097 Bonds of True Love — [Start of Your Turn] ＜Delay＞: play 1 [Impmon] free", () => {
  const delayBoard = (opts?: { own?: unknown[]; trash?: string[] }) => ({
    0: {
      battleArea: [{ card: "BT19-097", as: "bonds" }, ...((opts?.own ?? []) as never[])],
      hand: [{ card: "BT1-009", as: "spare" }],
      trash: (opts?.trash ?? ["BT2-068"]).map((card, index) => ({ card, as: `trash${index}` })),
      deck: [...inertDeck],
      security: [...inertSecurity],
    },
    1: { deck: [...inertDeck], security: [...inertSecurity] },
  });

  it("activates at the start of your turn with no Digimon and plays [Impmon] from the trash for free", async () => {
    const s = setupEngine(delayBoard(), { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    await s.ready();
    const bondsInstance = s.inst("bonds").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT2-068"));

    // Impmon is on the board and NOTHING was paid for it (its play cost is 3).
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("trash0").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(0);
    // §16-17: using a ＜Delay＞ trashes the Option that carried it.
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === bondsInstance)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bondsInstance)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does NOT activate while you have a Digimon: the effect-level condition gates it", async () => {
    const s = setupEngine(delayBoard({ own: [{ card: "BT2-067", as: "purple", dp: 20_000 }] }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    s.state.memory = 0;
    await s.ready();
    const bondsInstance = s.inst("bonds").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    // FAILS-WHEN-REVERTED (the `youHaveNone` Digimon condition): Impmon would be played here.
    expect(boardCardIds(s)).toEqual(["BT19-097", "BT2-067"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("trash0").instanceId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === bondsInstance)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("near-miss peer: Impmon (X Antibody) in the trash is NOT a legal [Impmon]", async () => {
    const s = setupEngine(delayBoard({ trash: ["BT12-073"] }), { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    // FAILS-WHEN-REVERTED (`nameExact`): a substring `match: "name"` gate would play it.
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-073")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trash0").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-097 Bonds of True Love — [Security] place this card in the battle area", () => {
  it("places itself on the security player's board from a REAL security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-052", as: "attacker", dp: 3000 }],
          deck: [...inertDeck],
          security: [...inertSecurity],
        },
        1: {
          deck: [...inertDeck],
          security: [{ card: "BT19-097", as: "bonds" }, "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // Placed, not trashed, and nothing was paid — the security player owns no purple permanent,
    // and CR 4-22-5 exempts an effect activated without USING the card.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("bonds").instanceId,
    ]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
