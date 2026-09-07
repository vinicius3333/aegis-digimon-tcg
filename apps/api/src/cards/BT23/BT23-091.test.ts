import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-091.js";

// Fixture cast (all legal main-deck cards; no Digi-Egg ever sits in security or deck):
//   BT22-053 Keramon      Black, Lv.3, 1000 DP, [CS] trait — the only trait carrier needed.
//   BT1-049  Labramon     Yellow, 1000 DP, vanilla — the lowest-DP deletion target.
//   BT1-034  Ikkakumon    Blue, 5000 DP, vanilla — the higher-DP survivor.
//   BT1-028  Elecmon      Blue, 3000 DP, vanilla — a non-[CS] attacker/bystander.
//   BT1-030  Gomamon      Blue, 3000 DP, vanilla — spare playable card / security filler.
// None of them are Red, so the printed Red color requirement is only ever met by the waiver.
const CS_DIGIMON = "BT22-053";
const CS_TAMER = "BT23-082"; // Makiko Date, Yellow Tamer with the [CS] trait.
const LOWEST = "BT1-049";
const HIGHER = "BT1-034";
const NON_CS = "BT1-028";
const FILLER = "BT1-030";

/** How many times the engine has offered BT23-091's optional ＜Delay＞ prompt so far. */
function delayPrompts(s: { decisions: { req: { kind: string; sourceCardId?: string } }[] }): number {
  return s.decisions.filter((d) => d.req.kind === "optional" && d.req.sourceCardId === "BT23-091").length;
}

describe("BT23-091 Wolkenapalm", () => {
  it("matches every catalog field and compiles all four printed clauses", () => {
    expect(getCardDefinition("BT23-091")).toMatchObject({
      cardId: "BT23-091",
      nameEn: "Wolkenapalm",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual(["Static", "Main", "YourTurn", "Security"]);
  });

  // ---------------------------------------------------------------------------
  // Clause 1 — "While you have a Digimon or Tamer with the [CS] trait on the
  // field, you can ignore this card's color requirements."
  // ---------------------------------------------------------------------------

  it("rejects the play when no [CS] card and no Red source is on the board", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT23-091", as: "option" }], battleArea: [NON_CS] } });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(5);
  });

  it("waives the color requirement for a battle-area [CS] Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-091", as: "option" }], battleArea: [{ card: CS_DIGIMON, as: "cs" }] },
    });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("waives the color requirement for a battle-area [CS] Tamer", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-091", as: "option" }], battleArea: [{ card: CS_TAMER, as: "tamer" }] },
    });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    assertNoLoudGap(s);
  });

  // KB Q5364 answers "on the field" as battle area OR breeding area in general. Comprehensive
  // Rules §3-4-5-8 overrides that for a TRAIT reference: "Information on cards in breeding
  // areas can't be referenced, except for effects that explicitly specify or reference
  // breeding areas", and its worked example is exactly this waiver shape ("even if you have a
  // Digimon with the [Armor Form] trait in the breeding area, you can't ignore the color
  // requirements"). So a [CS] Digimon in breeding must NOT unlock the waiver.
  it("does not waive the color requirement for a [CS] Digimon in the breeding area (CR 3-4-5-8)", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-091", as: "option" }], breeding: { card: CS_DIGIMON, as: "cs" } },
    });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(5);
  });

  it("does not waive the color requirement for an opponent's [CS] Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-091", as: "option" }] },
      1: { battleArea: [{ card: CS_DIGIMON, as: "opponentCs" }] },
    });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  // ---------------------------------------------------------------------------
  // Clause 2 — "[Main] Delete 1 of your opponent's Digimon with the lowest DP.
  // Then, place this card in the battle area."
  // ---------------------------------------------------------------------------

  it("deletes only the lowest-DP opponent Digimon and then places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-091", as: "option" }], battleArea: [{ card: CS_DIGIMON, as: "cs" }] },
        1: {
          battleArea: [
            { card: LOWEST, as: "lowest" },
            { card: HIGHER, as: "higher" },
          ],
          security: [FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const optionInstanceId = s.inst("option").instanceId;
    const lowestId = s.perm("lowest").permanentId;
    const higherId = s.perm("higher").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([higherId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([LOWEST]);
    expect(lowestId).not.toBe(higherId);
    // The Option survives the §17-1-3-2-2 rule sweep only because it was placed BY an effect.
    const placed = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === optionInstanceId);
    expect(placed?.placedByEffect).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("still places itself when the opponent has no Digimon to delete", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-091", as: "option" }], battleArea: [{ card: CS_DIGIMON, as: "cs" }] },
        1: { security: [FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const optionInstanceId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    const placed = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === optionInstanceId);
    expect(placed?.placedByEffect).toBe(true);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // Clause 3 — "[Your Turn] When one of your [CS] trait Digimon attacks,
  // ＜Delay＞ ・Delete 1 of your opponent's Digimon with the lowest DP."
  // ---------------------------------------------------------------------------

  it("holds the Delay on the placement turn, then spends it on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-091", as: "option" }, FILLER],
          battleArea: [{ card: CS_DIGIMON, as: "attacker", dp: 12000 }],
          deck: Array(10).fill(FILLER),
        },
        1: {
          battleArea: [
            { card: LOWEST, as: "lowest" },
            { card: HIGHER, as: "higher" },
          ],
          security: [FILLER, FILLER, FILLER],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const higherId = s.perm("higher").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    // Main: deletes the 1000 DP Labramon and places the Option.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    const onBoard = (): boolean =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId);
    expect(onBoard()).toBe(true);

    // Same turn: ＜Delay＞ cannot be activated the turn its card enters play (CR §16-17,
    // glossary "You can't activate this effect the turn this card enters play").
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(delayPrompts(s)).toBe(0);
    expect(onBoard()).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([higherId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(onBoard()).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // Next own turn: the same attack now trashes the Option and deletes the lowest DP.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !onBoard());
    expect(delayPrompts(s)).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === LOWEST)).toHaveLength(1);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === HIGHER)).toHaveLength(1);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves the Delay unspent when its optional prompt is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-091", as: "option" }, FILLER],
          battleArea: [{ card: CS_DIGIMON, as: "attacker", dp: 12000 }],
          deck: Array(10).fill(FILLER),
        },
        1: {
          battleArea: [
            { card: LOWEST, as: "lowest" },
            { card: HIGHER, as: "survivor" },
          ],
          security: [FILLER, FILLER, FILLER],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const survivorId = s.perm("survivor").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(delayPrompts(s)).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([survivorId]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer the Delay when a non-[CS] Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-091", as: "option" }, FILLER],
          battleArea: [
            { card: CS_DIGIMON, as: "cs" },
            { card: NON_CS, as: "attacker", dp: 12000 },
          ],
          deck: Array(10).fill(FILLER),
        },
        1: {
          battleArea: [
            { card: LOWEST, as: "lowest" },
            { card: HIGHER, as: "survivor" },
          ],
          security: [FILLER, FILLER, FILLER],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const survivorId = s.perm("survivor").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([survivorId]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer the Delay on the opponent's turn for the opponent's [CS] attacker", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-091", as: "option" }, FILLER],
          battleArea: [{ card: CS_DIGIMON, as: "cs" }],
          security: [FILLER, FILLER, FILLER],
          deck: Array(10).fill(FILLER),
        },
        1: {
          battleArea: [
            { card: CS_DIGIMON, as: "opponentAttacker", dp: 12000 },
            { card: LOWEST, as: "opponentFodder" },
          ],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(delayPrompts(s)).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("cs").permanentId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // Clause 4 — "[Security] Delete 1 of your opponent's Digimon with the lowest
  // DP. Then, place this card in the battle area."
  // ---------------------------------------------------------------------------

  it("deletes the attacker side's lowest-DP Digimon from security and then places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HIGHER, as: "attacker" },
            { card: LOWEST, as: "attackerLowest" },
          ],
          deck: Array(10).fill(FILLER),
        },
        1: {
          security: [{ card: "BT23-091", as: "option" }],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    // The security player's own lowest-DP opponent is the attacking side's 1000 DP Labramon.
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([attackerId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([LOWEST]);
    const placed = s.state.players[1]!.battleArea.find((p) => p.topCard?.instanceId === optionInstanceId);
    expect(placed?.placedByEffect).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
