import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-070.js";
import "../index.js";

const CARD_ID = "EX10-070";

/**
 * EX10-070 God Grade Unleashed — Black Option, play cost 2, [Appmon]/[Leviathan].
 *
 *   While you have a Digimon or Tamer with the [Appmon] trait on the field, you can ignore
 *     this card's color requirements.
 *   [Main] ＜Draw 1＞ Then, place this card in the battle area.
 *   [All Turns] When effects trash any of your Digimon's link cards, ＜Delay＞
 *     ・You may link 1 Digimon card with the [Appmon] trait from your trash to 1 of those
 *       Digimon without paying the cost.
 *   [Security] Place this card in the battle area.
 *
 * Every clause is driven through public intents and the production turn loop:
 *   - the colour waiver: `playCard` accepted / rejected as `color-requirement-unmet`;
 *   - [Main]: `playCard`, with the drawn card and the paid memory asserted exactly;
 *   - the link-card trash: seat plays BT25-073 Dragomon, whose [On Play] cost is
 *     "By trashing 1 of your Digimon's link cards" — a genuine effect trash;
 *   - ＜Delay＞: the Option reaches the battle area through its own [Main] clause and the
 *     real turn loop carries the board to its controller's NEXT turn, so §16-17-3 (unusable
 *     the turn it entered play) and the later activation are both proved on a played card,
 *     never on a hand-set `placedByEffect` flag;
 *   - Q5184: two `linkCard` intents onto a base-limit-1 host, so the rule-check sweep
 *     (CR §17-1-3-2-5) replaces the link card — no effect trash, no trigger;
 *   - [Security]: the opponent attacks the player and a real security check resolves it.
 * No injected timing (`advance.fire*`), no `verb.*`, and no engine internals anywhere.
 *
 * Fixtures — `traits = forms ∪ attributes ∪ types` (engine/cards/cardData.ts staticTraitsOf),
 * so [Appmon] lives in `forms` on EX10 Appmon Digimon:
 *   EX10-029 Warpmon  — Black Lv.4, [Appmon] trait, satisfies BT24-053's [Link] requirement.
 *   BT24-053 Protecmon — Black Lv.3, [Appmon] trait, "[Link] [Appmon] trait: Cost 1",
 *                        link effect ＜Blocker＞ only. The link material and the link card.
 *   BT1-009 Monodramon — inert Lv.3, no [Appmon] trait and NO ＜Link＞: the negative material.
 *   BT25-073 Dragomon  — the public link-card trasher (no [TS] card in hand, so only the
 *                        cost is observable).
 */

/** Board for every ＜Delay＞ scenario: the Option in hand, a linked [Appmon] host, a trasher. */
function delayBoard(options?: {
  material?: "trash" | "hand" | "none";
  opponentTrasher?: boolean;
  /** The host/link pair. "appmon" seeds EX10-029 + BT24-053; "maquinamon" seeds EX11-027 twice. */
  host?: "appmon" | "maquinamon";
}) {
  const material = options?.material ?? "trash";
  const host = options?.host ?? "appmon";
  const hostCard = host === "appmon" ? "EX10-029" : "EX11-027";
  const linkCard = host === "appmon" ? "BT24-053" : "EX11-027";
  return {
    0: {
      hand: [
        { card: CARD_ID, as: "option" },
        ...(options?.opponentTrasher === true ? [] : [{ card: "BT25-073", as: "dragomon" }]),
        ...(material === "hand" ? [{ card: "BT24-053", as: "material" }] : []),
      ],
      battleArea: [{ card: hostCard, as: "host", linked: [{ card: linkCard, as: "linkCard" }] }],
      trash: material === "trash" ? [{ card: "BT24-053", as: "material" }] : [],
      deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-013", "BT1-014"],
    },
    1: {
      hand: [...(options?.opponentTrasher === true ? [{ card: "BT25-073", as: "theirDragomon" }] : [])],
      battleArea:
        options?.opponentTrasher === true
          ? [{ card: "EX10-029", as: "theirHost", linked: [{ card: "BT24-053", as: "theirLinkCard" }] }]
          : [],
      deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-013", "BT1-014"],
    },
  };
}

/** Optional prompts raised so far, in order. */
function optionals(s: EngineSetup) {
  return s.decisions.filter(({ req }) => req.kind === "optional");
}

/**
 * Answer the optional ("use this effect?") prompts in order with a scripted yes/no list —
 * one flow raises Dragomon's own [On Play] and this card's ＜Delay＞, which must be answered
 * differently, and the harness's all-or-nothing flags cannot express that.
 */
async function answerOptionals(s: EngineSetup, plan: boolean[]): Promise<void> {
  let handled = 0;
  for (const accept of plan) {
    await settle(() => optionals(s).length > handled);
    const pending = optionals(s)[handled];
    if (pending === undefined) return;
    handled += 1;
    s.engine.applyIntent(pending.seat, {
      type: "respondDecision",
      decisionId: pending.req.decisionId,
      response: { kind: "optional", accept },
    });
  }
}

/** Play the Option through its own [Main] clause and assert it reached the battle area. */
async function playOption(s: EngineSetup): Promise<void> {
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
}

describe("EX10-070 God Grade Unleashed", () => {
  it("matches the catalog and compiles all four printed clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX10",
      nameEn: "God Grade Unleashed",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 2,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["Appmon", "Leviathan"],
      securityEffectText: "[Security] Place this card in the battle area.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          actions: [
            expect.objectContaining({
              kind: "WaiveColorRequirement",
              condition: expect.objectContaining({
                kind: "youHave",
                filter: expect.objectContaining({
                  kind: ["Digimon", "Tamer"],
                  nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
                }),
              }),
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Main",
          actions: [
            expect.objectContaining({ kind: "Draw", controller: "mine", amount: 1 }),
            expect.objectContaining({ kind: "PlaceInBattleAreaSelf" }),
          ],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          // The printed ＜Delay＞ is the encoding; `delayArmedIntrinsic` is synthesized onto the
          // SubTrigger by `withIntrinsicDelayGate` at registration, never carried in the IR.
          keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenLinkTrashed",
              sourceFilter: { controller: "mine", kind: ["Digimon"] },
              actions: [
                expect.objectContaining({
                  kind: "Link",
                  from: ["trash"],
                  payCost: false,
                  optional: true,
                  target: expect.objectContaining({
                    filter: expect.objectContaining({
                      controller: "mine",
                      zone: "trash",
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
                    }),
                  }),
                  recipient: expect.objectContaining({ sourceRef: "triggerSubject", count: 1 }),
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [expect.objectContaining({ kind: "PlaceInBattleAreaSelf" })],
        }),
      ]),
    );
  });

  // --- Colour requirement waiver ---

  it("is refused as color-requirement-unmet with no [Appmon] and no Black permanent", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        // Red, no [Appmon] trait: neither the printed Black requirement nor the waiver is met.
        battleArea: [{ card: "BT1-009", as: "plain" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.memory).toBe(5);
  });

  it("plays off an [Appmon] DIGIMON of another colour, ignoring the Black requirement", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        // BT23-007 Musclemon: RED, [Appmon] trait. Only the waiver can make this play legal.
        battleArea: [{ card: "BT23-007", as: "appmon" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    await playOption(s);

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(true);
  });

  it("plays off an [Appmon] TAMER of another colour ('a Digimon or Tamer')", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        // BT21-084 Gatchmon: RED Tamer, [Appmon] trait.
        battleArea: [{ card: "BT21-084", as: "appmonTamer" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    await playOption(s);

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(true);
  });

  // --- [Main] ＜Draw 1＞ Then, place this card in the battle area. ---

  it("[Main] draws exactly the top card of deck, pays 2 memory and places itself in the battle area", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        battleArea: [{ card: "EX10-029", as: "appmon" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    await playOption(s);
    await settle(() => false, 30);
    await s.ready();

    const p0 = s.state.players[0]!;
    // The Option left the hand and the drawn card entered it.
    expect(p0.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    expect(p0.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["EX10-029", CARD_ID]);
    // It is a placed Option permanent, not a used-and-trashed one.
    expect(p0.trash).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // --- [All Turns] ＜Delay＞ ---

  it("§16-17-3: the ＜Delay＞ cannot be activated on the turn the Option entered the battle area", async () => {
    const s = setupEngine(delayBoard(), { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    await playOption(s);
    const linkCardId = s.inst("linkCard").instanceId;
    const materialId = s.inst("material").instanceId;

    // Same turn: a genuine effect trash of the host's link card.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === linkCardId));
    await settle(() => false, 60);
    await s.ready();

    // The trigger arrived, but the intrinsic Delay gate refuses: the Option stays on the
    // field, nothing is linked, and the [Appmon] material is still in the trash.
    expect(p0.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(true);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(materialId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("on a later turn, activates the ＜Delay＞: trashes itself and free-links an [Appmon] from trash to that Digimon", async () => {
    const s = setupEngine(delayBoard(), { autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    // Turn 1 (seat 0): play the Option through its own [Main] clause.
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const linkCardId = s.inst("linkCard").instanceId;
    const materialId = s.inst("material").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);

    // The opponent's turn, then back to seat 0: the Option is no longer "new".
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);

    // A genuine effect trash of one of YOUR Digimon's link cards.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    // Three optional prompts in order: Dragomon's [On Play] (its cost trashes the link card),
    // the intrinsic ＜Delay＞ activation (its cost trashes this Option), and the printed
    // "You may link ..." of the Link action itself.
    await answerOptionals(s, [true, true, true]);
    await settle(() => s.perm("host").linked.some(({ instanceId }) => instanceId === materialId));
    await settle(() => false, 60);
    await s.ready();

    // The ＜Delay＞ cost: the Option itself is trashed.
    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(false);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(optionId);
    // The [Appmon] material left the trash and is now the host's only link card.
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([materialId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(materialId);
    // The trashed link card stayed trashed; the recipient is the Digimon that triggered.
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(linkCardId);
    expect(s.perm("host").topCard?.cardId).toBe("EX10-029");
    // "without paying the cost": BT24-053's printed [Link] cost 1 is not charged. Only
    // Dragomon's own play cost 7 moved the gauge from the 10 set above.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the ＜Delay＞ leaves the Option on the field and links nothing", async () => {
    const s = setupEngine(delayBoard(), { autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const materialId = s.inst("material").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    // Accept Dragomon's [On Play] (the link card is still trashed), decline the ＜Delay＞.
    await answerOptionals(s, [true, false]);
    await settle(() => false, 60);
    await s.ready();

    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(materialId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer the ＜Delay＞ when the only [Appmon] link material is in HAND, not the trash", async () => {
    // The seeded link card must NOT itself be legal material: an [Appmon] link card would land
    // in the trash when Dragomon trashes it and supply the Link on its own. EX11-027 Maquinamon
    // carries ＜Link＞ ("[Link] [Maquinamon] in text") but no [Appmon] trait, so after the trash
    // the only [Appmon] copy in the match is the one in hand.
    const s = setupEngine(delayBoard({ material: "hand", host: "maquinamon" }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const materialId = s.inst("material").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const linkCardId = s.inst("linkCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === linkCardId));
    await settle(() => false, 60);
    await s.ready();

    // `from: ["trash"]` — a hand copy is not material, so the Delay cost is never paid.
    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(materialId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer the ＜Delay＞ when the trash holds no linkable [Appmon] Digimon card", async () => {
    // The trash ends up holding EX11-027 Maquinamon (＜Link＞, but no [Appmon] trait — the
    // trashed link card) and BT1-009 Monodramon ([Appmon]-less and no ＜Link＞ at all). Neither
    // is legal material, so this proves the target filter rather than an empty zone.
    const board = delayBoard({ material: "none", host: "maquinamon" });
    board[0].trash = [{ card: "BT1-009", as: "wrongMaterial" }];
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const wrongMaterialId = s.inst("wrongMaterial").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const linkCardId = s.inst("linkCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === linkCardId));
    await settle(() => false, 60);
    await s.ready();

    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(wrongMaterialId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not arm for an OPPONENT's Digimon's link card ('any of YOUR Digimon's')", async () => {
    const s = setupEngine(delayBoard({ opponentTrasher: true }), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    });
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const materialId = s.inst("material").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);

    // The opponent trashes THEIR OWN Digimon's link card.
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    const theirLinkCardId = s.inst("theirLinkCard").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirDragomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === theirLinkCardId));
    await settle(() => false, 60);
    await s.ready();

    // `sourceFilter.controller: "mine"` — the watcher does not arm, so the ＜Delay＞ is not spent.
    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(materialId);
    expect(s.perm("theirHost").linked).toHaveLength(0);
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("linkCard").instanceId]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5184: a link card replaced by the link-limit rule sweep does not trigger the ＜Delay＞", async () => {
    // KB Q5184: "Does this card's [All Turns] effect trigger even when a card would get linked
    // by an effect to an already linked card whose link card is trashed and replaced?" — No.
    // CR §4-8-5 / §17-1-3-2-5: the excess link card is trashed by the rule-check sweep, which
    // is rule processing, not an effect trash.
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "option" },
            { card: "BT24-053", as: "secondLink" },
          ],
          battleArea: [{ card: "EX10-029", as: "host", linked: [{ card: "BT24-053", as: "firstLink" }] }],
          trash: [{ card: "BT24-053", as: "material" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    const materialId = s.inst("material").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const firstLinkId = s.inst("firstLink").instanceId;
    const secondLinkId = s.inst("secondLink").instanceId;
    const optionalsBefore = optionals(s).length;

    // A second link onto a base-limit-1 host: the first link card is trashed by the sweep.
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: secondLinkId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === firstLinkId));
    await settle(() => false, 60);
    await s.ready();

    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([secondLinkId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(firstLinkId);
    // No effect trash: the Option is untouched, the material stays in the trash, no prompt.
    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(materialId);
    expect(optionals(s)).toHaveLength(optionalsBefore);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5184 (the printed case): an EFFECT link onto an already-linked Digimon does not trigger it", async () => {
    // Q5184 asks about the link being made BY AN EFFECT. BT25-070 Logamon's [Main] links a
    // [Social]/[Tool]/[Game] Digimon card from its controller's trash to itself; Logamon is
    // already at its base link limit of 1, so the rule-check sweep replaces the old link card.
    // Fixtures: BT21-041 Calendamon ([Tool], "[Link] [Appmon] trait") is the effect's material,
    // BT24-053 Protecmon is the link card it replaces. Logamon carries the [Appmon] trait, so
    // both satisfy the printed [Link] requirement.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "option" }],
          battleArea: [{ card: "BT25-070", as: "host", linked: [{ card: "BT24-053", as: "firstLink" }] }],
          trash: [{ card: "BT21-041", as: "effectMaterial" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const p0 = s.state.players[0]!;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await playOption(s);
    const optionId = s.inst("option").instanceId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const firstLinkId = s.inst("firstLink").instanceId;
    const effectMaterialId = s.inst("effectMaterial").instanceId;
    const optionalsBefore = optionals(s).length;

    const entry = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find(({ description }) => description?.includes("Link") === true);
    expect(entry, "BT25-070 offers its [Main] link ability").toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === firstLinkId));
    await settle(() => false, 60);
    await s.ready();

    // The effect link landed and the rule sweep replaced the old link card.
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([effectMaterialId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(firstLinkId);
    // Q5184: NOT an effect trash. The Option is untouched even though the replaced BT24-053
    // now sits in the trash as perfectly legal [Appmon] link material.
    expect(p0.battleArea.some(({ topCard }) => topCard?.instanceId === optionId)).toBe(true);
    expect(optionals(s).length).toBe(optionalsBefore + 1); // only BT25-070's own "You may link"

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- [Security] Place this card in the battle area. ---

  it("[Security] places itself in the battle area on a real security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: { security: [{ card: CARD_ID, as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === optionId));
    await settle(() => false, 60);
    await s.ready();

    const p1 = s.state.players[1]!;
    // Placed, not used-and-trashed, and it survives the §17-1-3-2-2 Option sweep because the
    // effect placed it (`placedByEffect`).
    expect(p1.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual([optionId]);
    expect(p1.security).toHaveLength(0);
    expect(p1.trash.map(({ instanceId }) => instanceId)).not.toContain(optionId);
    // No [Main] draw on the security route: the deck is untouched.
    expect(p1.deck).toHaveLength(0);
    expect(p1.hand).toHaveLength(0);
    // The security placement pays nothing.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
