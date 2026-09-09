import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-088 Ai & Mako (Purple Tamer, cost 3).
//
//   [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
//   [Main] If you have 20 or more cards in your trash, by suspending this Tamer, 1 of your
//     [Impmon] may digivolve into [Beelzemon] in the hand or trash for a digivolution cost
//     of 4, ignoring its digivolution requirements.
//   [Security] Play this card without paying the cost.
//
// KB: `node tools/kb/query.mjs card BT19-088` reports no knowledge-base entries, and
// docs/audits/BT19-reaudit/KB-INDEX.md lists 0 Q&A ids for this card. Every clause below is
// therefore proved against the printed text and the comprehensive rules alone.

const AI_MAKO = "BT19-088";
const IMPMON = "BT2-068"; // "Impmon", Lv.3 purple
const IMPMON_X = "BT12-073"; // "Impmon (X Antibody)" — a DIFFERENT exact name
const BLIMPMON = "BT20-049"; // "Blimpmon" — contains "impmon" as a substring
const BEELZEMON = "BT19-071"; // "Beelzemon", Lv.6 purple
const BEELZEMON_X = "BT12-085"; // "Beelzemon (X Antibody)" — a DIFFERENT exact name
const BEELZEMON_BLAST = "BT19-074"; // "Beelzemon: Blast Mode" — a DIFFERENT exact name

const FILLER = ["BT1-009", "BT1-010", "BT1-012", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-012", "BT1-013"];
/** 20 inert main-deck Digimon: the exact threshold the [Main] clause reads. */
const TRASH_20 = Array.from({ length: 20 }, (_, i) => FILLER[i % FILLER.length]!);
const TRASH_19 = TRASH_20.slice(1);

/** The activatable-effect keys the client is offered for a permanent. */
function offeredKeys(s: ReturnType<typeof setupEngine>, alias: string): string[] {
  return observe(s.engine)
    .activatableEffects(s.perm(alias))
    .map((effect) => effect.effectKey);
}

/** The runtime key of the card's single activatable [Main] clause. */
function mainEffectKey(s: ReturnType<typeof setupEngine>, alias: string): string {
  const keys = offeredKeys(s, alias);
  expect(keys).toHaveLength(1);
  return keys[0]!;
}

/**
 * The [Main] clause's runtime key, read off a fixture that satisfies every gate.
 *
 * The engine stops OFFERING the clause the moment a gate fails, so a negative fixture has no
 * key of its own to name; each negative below asserts both that nothing is offered AND that
 * naming this key anyway is rejected.
 */
function discoverMainEffectKey(): string {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: IMPMON, as: "impmon" },
        { card: AI_MAKO, as: "tamer" },
      ],
      hand: [{ card: BEELZEMON, as: "beelz" }],
      trash: [...TRASH_20],
      deck: [...FILLER],
      security: [...SECURITY],
    },
    1: { security: [...SECURITY], deck: [...FILLER] },
  });
  s.state.memory = 6;
  return mainEffectKey(s, "tamer");
}

const MAIN_KEY = discoverMainEffectKey();

describe("BT19-088 Ai & Mako", () => {
  it("matches the catalog identity and printed clauses", () => {
    expect(getCardDefinition(AI_MAKO)).toMatchObject({
      nameEn: "Ai & Mako",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 3,
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    // NOTE: the catalog runs the two clauses together with a DOUBLE space, not a newline.
    expect(getCardDefinition(AI_MAKO)?.effectText).toBe(
      "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.  " +
        "[Main] If you have 20 or more cards in your trash, by suspending this Tamer, 1 of your [Impmon] may " +
        "digivolve into [Beelzemon] in the hand or trash for a digivolution cost of 4, ignoring its " +
        "digivolution requirements.",
    );
  });

  it("keeps the three clauses in the runtime record, with EXACT bracketed name references", () => {
    const card = runtimeCompiledCard(AI_MAKO);
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "Digivolve",
            // Trap check: `[Impmon]` / `[Beelzemon]` are bracketed exact names, so both refs
            // must be `nameExact`; `match: "name"` is the substring form.
            target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Impmon"], match: "nameExact" }] } },
            into: { nameOrTrait: [{ tokens: ["Beelzemon"], match: "nameExact" }] },
            payCost: true,
            from: ["hand", "trash"],
            costOverride: 4,
            ignoreRequirements: true,
            optional: true,
            condition: { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 20 },
            cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
    ]);
  });

  // --- Tamer play cost ---------------------------------------------------------------------

  it("costs 3 memory to play from hand in a real Main phase", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: AI_MAKO, as: "tamer" }, "BT1-009"], deck: [...FILLER], security: [...SECURITY] },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === AI_MAKO));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  // --- [Start of Your Main Phase] ------------------------------------------------------------

  it("[Start of Your Main Phase] gains 1 memory while the opponent has a Digimon, read inside Main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: AI_MAKO, as: "tamer" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall" }], security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("near-miss: an opponent board holding only a TAMER is not 'has a Digimon' — no memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: AI_MAKO, as: "tamer" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT19-080", as: "oppTamer" }], security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("near-miss: the clause reads the OPPONENT's board, not the controller's own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: AI_MAKO, as: "tamer" },
            { card: "BT1-009", as: "ownDigimon" },
          ],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  // --- [Security] ------------------------------------------------------------------------------

  it("[Security] plays itself for free through a real security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "attacker" }], deck: [...FILLER], security: [...SECURITY] },
        1: {
          security: [
            { card: AI_MAKO, as: "securityTamer" },
            { card: "BT1-012", as: "securityFiller" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamerId = s.inst("securityTamer").instanceId;
    const fillerId = s.inst("securityFiller").instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === tamerId));

    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([tamerId]);
    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([fillerId]);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).not.toContain(tamerId);
    // Nothing paid the printed cost of 3.
    expect(s.state.memory).toBe(3);
    expect(s.perm("attacker").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("the other security outcome: a plain card is trashed and BT19-088 stays face down", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "attacker" }], deck: [...FILLER], security: [...SECURITY] },
        1: {
          security: [
            { card: "BT1-012", as: "securityFiller" },
            { card: AI_MAKO, as: "securityTamer" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamerId = s.inst("securityTamer").instanceId;
    const fillerId = s.inst("securityFiller").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((c) => c.instanceId === fillerId));

    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([tamerId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  // --- [Main] Impmon -> Beelzemon ---------------------------------------------------------------

  it("digivolves [Impmon] into a HAND [Beelzemon] for 4, suspending the Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: IMPMON, as: "impmon" },
            { card: AI_MAKO, as: "tamer" },
          ],
          hand: [{ card: BEELZEMON, as: "beelz" }, "BT1-009"],
          trash: [...TRASH_20],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("impmon").topCard!.instanceId, s.inst("beelz").instanceId);
    s.state.memory = 6;
    await s.ready();

    const impmonInstanceId = s.perm("impmon").topCard!.instanceId;
    const beelzId = s.inst("beelz").instanceId;
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tamer").topCard!.instanceId,
        effectKey: mainEffectKey(s, "tamer"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("impmon").topCard?.instanceId === beelzId);

    // Exact endpoints: Beelzemon is now the top card of the SAME permanent, Impmon is its
    // only digivolution card, the Tamer is suspended and 4 memory was paid.
    const host = s.perm("impmon");
    expect(host.topCard?.cardId).toBe(BEELZEMON);
    expect(host.stack.map((c) => c.instanceId)).toEqual([impmonInstanceId]);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
    // The digivolution draw fired (hand: -1 Beelzemon, +1 drawn card).
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).not.toContain(beelzId);
    assertNoLoudGap(s);
  });

  it("digivolves [Impmon] into a TRASH [Beelzemon] — the printed 'in the hand or trash'", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: IMPMON, as: "impmon" },
            { card: AI_MAKO, as: "tamer" },
          ],
          hand: ["BT1-009"],
          trash: [...TRASH_19, { card: BEELZEMON, as: "beelz" }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("impmon").topCard!.instanceId, s.inst("beelz").instanceId);
    s.state.memory = 6;
    await s.ready();

    const impmonInstanceId = s.perm("impmon").topCard!.instanceId;
    const beelzId = s.inst("beelz").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tamer").topCard!.instanceId,
        effectKey: mainEffectKey(s, "tamer"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("impmon").topCard?.instanceId === beelzId);

    const host = s.perm("impmon");
    expect(host.topCard?.cardId).toBe(BEELZEMON);
    expect(host.stack.map((c) => c.instanceId)).toEqual([impmonInstanceId]);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(beelzId);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("refuses at 19 cards in the trash and allows the same activation at 20", async () => {
    const build = (trash: string[]) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: IMPMON, as: "impmon" },
              { card: AI_MAKO, as: "tamer" },
            ],
            hand: [{ card: BEELZEMON, as: "beelz" }, "BT1-009"],
            trash,
            deck: [...FILLER, ...FILLER],
            security: [...SECURITY],
          },
          1: { security: [...SECURITY], deck: [...FILLER] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm("impmon").topCard!.instanceId, s.inst("beelz").instanceId);
      s.state.memory = 6;
      return s;
    };

    const below = build([...TRASH_19]);
    await below.ready();
    expect(below.state.players[0]!.trash).toHaveLength(19);
    expect(offeredKeys(below, "tamer")).toEqual([]);
    expect(
      below.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: below.perm("tamer").topCard!.instanceId,
        effectKey: MAIN_KEY,
      }).ok,
    ).toBe(false);
    expect(below.perm("impmon").topCard?.cardId).toBe(IMPMON);
    expect(below.perm("tamer").isSuspended).toBe(false);
    expect(below.state.memory).toBe(6);

    const at = build([...TRASH_20]);
    await at.ready();
    expect(at.state.players[0]!.trash).toHaveLength(20);
    expect(
      at.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: at.perm("tamer").topCard!.instanceId,
        effectKey: mainEffectKey(at, "tamer"),
      }),
    ).toEqual({ ok: true });
    await settle(() => at.perm("impmon").topCard?.cardId === BEELZEMON);
    expect(at.perm("impmon").topCard?.cardId).toBe(BEELZEMON);
    expect(at.perm("tamer").isSuspended).toBe(true);
  });

  it("an already-suspended Tamer cannot pay the printed cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: IMPMON, as: "impmon" },
            { card: AI_MAKO, as: "tamer", suspended: true },
          ],
          hand: [{ card: BEELZEMON, as: "beelz" }, "BT1-009"],
          trash: [...TRASH_20],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("impmon").topCard!.instanceId, s.inst("beelz").instanceId);
    s.state.memory = 6;
    await s.ready();

    expect(offeredKeys(s, "tamer")).toEqual([]);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tamer").topCard!.instanceId,
        effectKey: MAIN_KEY,
      }).ok,
    ).toBe(false);
    expect(s.perm("impmon").topCard?.cardId).toBe(IMPMON);
    expect(s.state.memory).toBe(6);
  });

  // --- exact-name near misses -------------------------------------------------------------------

  it.each([
    ["Blimpmon (contains 'impmon' as a substring)", BLIMPMON],
    ["Impmon (X Antibody) (a different exact name)", IMPMON_X],
  ])("near-miss host: %s cannot be the [Impmon] that digivolves", async (_label, hostCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: hostCard, as: "host" },
            { card: AI_MAKO, as: "tamer" },
          ],
          hand: [{ card: BEELZEMON, as: "beelz" }, "BT1-009"],
          trash: [...TRASH_20],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").topCard!.instanceId, s.inst("beelz").instanceId);
    s.state.memory = 6;
    await s.ready();

    const hostInstanceId = s.perm("host").topCard!.instanceId;
    expect(offeredKeys(s, "tamer")).toEqual([]);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tamer").topCard!.instanceId,
        effectKey: MAIN_KEY,
      }).ok,
    ).toBe(false);
    expect(s.perm("host").topCard?.instanceId).toBe(hostInstanceId);
    expect(s.perm("host").topCard?.cardId).toBe(hostCard);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.memory).toBe(6);
  });

  it.each([
    ["Beelzemon (X Antibody)", BEELZEMON_X],
    ["Beelzemon: Blast Mode", BEELZEMON_BLAST],
  ])("near-miss target: %s is not [Beelzemon] and cannot be digivolved into", async (_label, intoCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: IMPMON, as: "impmon" },
            { card: AI_MAKO, as: "tamer" },
          ],
          hand: [{ card: intoCard, as: "into" }, "BT1-009"],
          trash: [...TRASH_20],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("impmon").topCard!.instanceId, s.inst("into").instanceId);
    s.state.memory = 6;
    await s.ready();

    const impmonInstanceId = s.perm("impmon").topCard!.instanceId;
    const res = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("tamer").topCard!.instanceId,
      effectKey: MAIN_KEY,
    });
    if (res.ok) await settle(() => true);

    // Whatever the activation verdict, the near-miss card never becomes the new top card.
    expect(s.perm("impmon").topCard?.instanceId).toBe(impmonInstanceId);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("into").instanceId);
  });

  // --- realistic stack: the printed clause ignores digivolution requirements -----------------------

  it("ignores the Lv.5 requirement: a Lv.3 [Impmon] with its own digivolution card reaches Lv.6", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: IMPMON, as: "impmon", under: [{ card: "BT1-009", as: "egg" }] },
            { card: AI_MAKO, as: "tamer" },
          ],
          hand: [{ card: BEELZEMON, as: "beelz" }, "BT1-009"],
          trash: [...TRASH_20],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("impmon").topCard!.instanceId, s.inst("beelz").instanceId);
    s.state.memory = 6;
    await s.ready();

    const eggId = s.inst("egg").instanceId;
    const impmonInstanceId = s.perm("impmon").topCard!.instanceId;
    const beelzId = s.inst("beelz").instanceId;
    expect(getCardDefinition(IMPMON)?.level).toBe(3);
    expect(getCardDefinition(BEELZEMON)?.level).toBe(6);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tamer").topCard!.instanceId,
        effectKey: mainEffectKey(s, "tamer"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("impmon").topCard?.instanceId === beelzId);

    // Bottom-most first: the pre-existing card stays beneath the Impmon it evolved from.
    expect(s.perm("impmon").stack.map((c) => c.instanceId)).toEqual([eggId, impmonInstanceId]);
    expect(s.perm("impmon").topCard?.cardId).toBe(BEELZEMON);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });
});
