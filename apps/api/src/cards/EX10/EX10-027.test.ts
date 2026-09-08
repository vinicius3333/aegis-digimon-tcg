import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-027.js";
import "../index.js";

const CARD_ID = "EX10-027";

const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

// The printed target set: "1 Digimon card with [Knightmon] in its text or the [Bagra Army]
// or [Twilight] trait". Q5081 makes "[Knightmon] in its text" the full union of name,
// traits and every text field, so each row proves a different arm of that union.
const QUALIFYING_TRASH_CARDS: [label: string, cardId: string][] = [
  ["Q5081 name substring: LordKnightmon carries no Bagra Army or Twilight trait", "AD1-018"],
  ["Q5081 effect-text hit: Kotemon only mentions [Knightmon] in its effect", "BT18-058"],
  ["the [Bagra Army] trait alone, with no [Knightmon] anywhere", "BT10-070"],
  ["the [Twilight] trait alone, with no [Knightmon] anywhere", "BT10-060"],
];

// Level 3 Black Digimon with no printed text at all: a legal NORMAL evolution source but an
// illegal source for the "Lv.3 w/[Knightmon] in text" alternate route.
const NO_KNIGHTMON_LV3 = "BT2-052";
// Level 3 Black Digimon whose effect text contains [Knightmon]: the alternate route's source.
const KNIGHTMON_TEXT_LV3 = "BT18-058";

const returnActions = [
  {
    kind: "Return",
    target: {
      filter: {
        zone: "trash",
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [
          { tokens: ["Knightmon"], match: "text" },
          { tokens: ["Bagra Army", "Twilight"], match: "trait" },
        ],
      },
      count: 1,
      upTo: true,
    },
    to: "hand",
    cost: {
      kind: "trash",
      target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
      raw: "By trashing 1 card in your hand",
    },
    optional: true,
    abortOnDecline: true,
  },
];

describe("EX10-027 DeadlyAxemon", () => {
  it("matches every catalog field and compiles every printed clause", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "DeadlyAxemon",
      colors: ["Black", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Animal", "Bagra Army", "Twilight"],
      inheritedEffectText: "＜Retaliation＞",
    });

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    // "w/[Knightmon] in text" is the substring union of Q5081, so `texts`, never `namesExact`.
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, texts: ["Knightmon"], cost: 2, isAlternate: true }]);

    // toEqual, not toMatchObject: an extra key on the filter (a `controller` on the
    // nameOrTrait union, an added `nameExact`) would narrow the printed target set, and
    // toMatchObject would let it through.
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)?.actions).toEqual(returnActions);
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")?.keywords).toEqual([
      { keyword: "Save", raw: "＜Save＞" },
    ]);
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
    });
  });

  // C2, played through the public playCard intent rather than injected timing.
  it("[On Play] trashes 1 hand card and returns 1 qualifying Digimon from the trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "deadly" },
            { card: "BT1-013", as: "cost" },
            { card: "BT1-014", as: "spare" },
          ],
          trash: [
            { card: KNIGHTMON_TEXT_LV3, as: "qualifying" },
            { card: "BT1-009", as: "nonMatching" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId, s.inst("nonMatching").instanceId, s.inst("qualifying").instanceId);
    s.state.memory = 4;
    const deadlyId = s.inst("deadly").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: deadlyId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("qualifying").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    const player = s.state.players[0]!;
    expect(player.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([deadlyId]);
    expect(s.state.memory).toBe(0);
    // The hand card paid as the cost sits in the trash; the qualifying Digimon came back.
    expect(player.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("spare").instanceId, s.inst("qualifying").instanceId].sort(),
    );
    expect(player.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("cost").instanceId, s.inst("nonMatching").instanceId].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // C1 + C2: the alternate route at cost 2 from a level 3 source with [Knightmon] in its
  // text, and the [When Digivolving] copy of the return clause on the same intent.
  it("[Digivolve] Lv.3 w/[Knightmon] in text costs 2 and fires [When Digivolving]", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KNIGHTMON_TEXT_LV3, as: "source" }],
          hand: [
            { card: CARD_ID, as: "deadly" },
            { card: "BT1-013", as: "cost" },
          ],
          trash: [{ card: "AD1-018", as: "qualifying" }],
          deck: [{ card: "BT1-014", as: "drawn" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId, s.inst("qualifying").instanceId);
    s.state.memory = 2;
    const deadlyId = s.inst("deadly").instanceId;
    const sourceId = s.inst("source").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: deadlyId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("qualifying").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    const player = s.state.players[0]!;
    expect(s.perm("source").topCard.instanceId).toBe(deadlyId);
    // `stack` holds only the cards beneath the top card.
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    // Cost 2, not the printed EvoCost of 3.
    expect(s.state.memory).toBe(0);
    // Bonus draw landed, the cost card was trashed, and the trash card came back.
    expect(player.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("drawn").instanceId, s.inst("qualifying").instanceId].sort(),
    );
    expect(player.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the alternate route from a level 3 source without [Knightmon] in its text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: NO_KNIGHTMON_LV3, as: "source" }],
        hand: [{ card: CARD_ID, as: "deadly" }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: { deck: INERT_DECK, security: INERT_SECURITY },
    });
    await s.ready();
    // 5 memory covers even the printed EvoCost of 3, so the refusal is the text gate.
    s.state.memory = 5;
    const deadlyId = s.inst("deadly").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: deadlyId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.perm("source").topCard.cardId).toBe(NO_KNIGHTMON_LV3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([deadlyId]);

    // The same source IS legal on the printed level 3 route at cost 3.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: deadlyId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(2);
  });

  // Q5081: every arm of "[Knightmon] in its text or the [Bagra Army] or [Twilight] trait".
  it.each(QUALIFYING_TRASH_CARDS)("returns a trash Digimon qualifying by %s", async (_label, cardId) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "deadly" },
            { card: "BT1-013", as: "cost" },
          ],
          trash: [
            { card: "BT1-009", as: "nonMatching" },
            { card: cardId, as: "qualifying" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    // The non-matching Digimon is preferred FIRST: if it were a legal candidate the
    // auto-responder would take it, so the qualifying card coming back proves the filter.
    preferred.push(s.inst("cost").instanceId, s.inst("nonMatching").instanceId, s.inst("qualifying").instanceId);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deadly").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("qualifying").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("qualifying").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("cost").instanceId, s.inst("nonMatching").instanceId].sort(),
    );
  });

  it("cannot return a Digimon that matches neither [Knightmon] text nor the two traits", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "deadly" },
            { card: "BT1-013", as: "cost" },
          ],
          trash: [{ card: "BT1-009", as: "nonMatching" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId, s.inst("nonMatching").instanceId);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deadly").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 0 && s.state.pendingDecision === undefined);

    // The non-matching Digimon never leaves the trash. Engine observation worth recording:
    // with no legal return target the whole action is skipped, so the hand-card cost is not
    // paid either. Q5082 only says the cost MAY be paid with nothing returned, so declining
    // to pay is not a rules violation; nothing on this card depends on the trash happening.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("nonMatching").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // Q5082: the trash is a cost, so it may be paid before the "you may return" is declined.
  it("Q5082: may pay the hand-card cost and still return nothing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "deadly" },
            { card: "BT1-013", as: "cost" },
          ],
          trash: [{ card: KNIGHTMON_TEXT_LV3, as: "qualifying" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deadly").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decisionId = s.state.pendingDecision!.decisionId;
    // One fused prompt: the hand-card cost is forced (a single legal card) and the only
    // SELECTABLE candidate is the qualifying trash Digimon, at `min: 0` — the "up to 1" of
    // "you may return". Answering it with nothing is the Q5082 branch.
    expect(s.decisions.at(-1)!.req.options).toMatchObject({
      min: 0,
      max: 1,
      candidateInstanceIds: [s.inst("qualifying").instanceId],
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    const player = s.state.players[0]!;
    expect(player.hand).toHaveLength(0);
    expect(player.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("cost").instanceId, s.inst("qualifying").instanceId].sort(),
    );
    expect(s.state.memory).toBe(0);
  });

  it("declining the optional pays no cost and returns nothing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "deadly" },
            { card: "BT1-013", as: "cost" },
          ],
          trash: [{ card: KNIGHTMON_TEXT_LV3, as: "qualifying" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deadly").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 0 && s.state.pendingDecision === undefined);

    const player = s.state.players[0]!;
    expect(player.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(player.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("qualifying").instanceId]);
  });

  it("with an empty hand the cost cannot be paid, so nothing returns", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "deadly" }],
          trash: [{ card: KNIGHTMON_TEXT_LV3, as: "qualifying" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deadly").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("qualifying").instanceId]);
  });

  // C3: ＜Save＞ after a real battle deletion, not an injected delete verb.
  it("[On Deletion] ＜Save＞ places it under a Tamer after it loses a battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "deadly" },
            {
              card: "BT12-094",
              as: "tamer",
              under: [
                { card: "BT1-013", as: "under0" },
                { card: "BT1-014", as: "under1" },
              ],
            },
          ],
          hand: ["BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const deadlyId = s.inst("deadly").instanceId;
    // `under` is bottom-most first, so the Tamer already holds under0 (bottom), under1 (top).
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("under0").instanceId,
      s.inst("under1").instanceId,
    ]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deadly").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === deadlyId));

    // Comprehensive rules 4-3: the saved card goes to the BOTTOM of the Tamer's stack, not
    // directly beneath the Tamer.
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      deadlyId,
      s.inst("under0").instanceId,
      s.inst("under1").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(deadlyId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(deadlyId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("＜Save＞ is declinable: refusing sends this card to the trash instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "deadly" },
            { card: "BT12-094", as: "tamer" },
          ],
          hand: ["BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const deadlyId = s.inst("deadly").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deadly").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === deadlyId));

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(deadlyId);
  });

  // C3 boundary: ＜Save＞ is "you MAY place this card under one of your Tamers". With no Tamer
  // in play there is no legal destination, so the card must reach the trash like any deletion.
  it("＜Save＞ with no Tamer in play sends this card to the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "deadly" }],
          hand: ["BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const deadlyId = s.inst("deadly").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deadly").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === deadlyId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([deadlyId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // C4: the inherited keyword belongs to the host it sits under, never to this card on top.
  it("grants inherited ＜Retaliation＞ to its host only", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-063", as: "host", under: [{ card: CARD_ID, as: "deadly" }] },
          { card: CARD_ID, as: "standalone" },
        ],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: { deck: INERT_DECK, security: INERT_SECURITY },
    });
    await s.ready();

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("deadly").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Retaliation")).toBe(false);
  });

  // C4 behaviourally: the host loses a battle it did not start and takes the attacker with it.
  // Also proves that this card's own [On Deletion] ＜Save＞ stays silent while it is a
  // digivolution card — only the top card's main effects belong to the permanent.
  it("inherited ＜Retaliation＞ deletes the attacker when the host dies in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "deadly" }], suspended: true }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: {
        battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
    });
    await s.ready();
    const hostId = s.inst("host").instanceId;
    const deadlyId = s.inst("deadly").instanceId;
    const attackerId = s.inst("attacker").instanceId;
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);

    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    // The host and this card both hit the trash; ＜Save＞ never fired from under the host.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual([hostId, deadlyId].sort());
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([attackerId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
