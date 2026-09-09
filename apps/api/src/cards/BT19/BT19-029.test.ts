import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT19-029.js";

/**
 * BT19-029 Tapirmon (Yellow, Lv.3, Vaccine, Holy Beast, 1000 DP, play cost 3).
 *
 * Main:      [On Play] By trashing your top security card, gain 1 memory.
 * Inherited: [All Turns] [Once Per Turn] When this yellow Digimon with the [Data]/[Witchelny]
 *            trait would leave the battle area by your opponent's effects, by trashing your top
 *            security card, it doesn't leave.
 *
 * Everything below drives public intents or the real turn loop. The opponent's removal is a real
 * BT2-091 Volcanic Flare played from the opponent's hand during the opponent's own Main phase, so
 * the "by your opponent's effects" gate is exercised by a genuine opposing resolution rather than
 * by an injected removal cause.
 */

const INERT_SECURITY = ["BT1-009", "BT1-011", "BT1-012"];

type Setup = ReturnType<typeof setupEngine>;

/** Open the named seat's real Main phase inside a running production turn loop. */
async function openMain(s: Setup, seat: 0 | 1): Promise<void> {
  await advance(s.engine).waitForMainPhase(seat);
}

/** Close the named seat's Main phase, tolerating production's own auto-pass. */
function closeMain(s: Setup, seat: 0 | 1): void {
  advance(s.engine).endMainPhaseIfOpen(seat);
}

/** Stop the running turn loop so the test can assert on a quiescent board. */
async function stopLoop(s: Setup, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT19-029 Tapirmon", () => {
  it("matches the printed catalog text and compiles both printed clauses", () => {
    expect(getCardDefinition("BT19-029")).toMatchObject({
      cardId: "BT19-029",
      nameEn: "Tapirmon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      attributes: ["Vaccine"],
      types: ["Holy Beast"],
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      effectText: "[On Play] By trashing your top security card, gain 1 memory.",
    });
    // The catalog prints a non-breaking space inside the inherited clause; compare on the
    // normalized text so the assertion is about wording, not whitespace encoding.
    expect(getCardDefinition("BT19-029")!.inheritedEffectText!.replace(/\u00a0/g, " ")).toBe(
      "[All Turns] [Once Per Turn] When this yellow Digimon with the [Data]/[Witchelny] trait would leave " +
        "the battle area by your opponent's effects, by trashing your top security card, it doesn't leave.",
    );
    // No printed [Digivolve] route, so the only legal source is the printed evolution cost.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          optional: true,
          cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security", position: "top" } } },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "opponentEffect",
          sourceFilter: {
            isSelfRef: true,
            colors: ["Yellow"],
            nameOrTrait: [
              { tokens: ["Data"], match: "trait" },
              { tokens: ["Witchelny"], match: "trait", orPrevious: true },
            ],
          },
        },
      ],
    });
  });

  it("pays the printed On Play cost from a real hand play and gains exactly 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-029", as: "tapir" },
            { card: "BT1-012", as: "spare" },
          ],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012"],
        },
        1: { security: INERT_SECURITY, deck: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tapir").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    // 5 memory - 3 play cost + 1 from the effect.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secNext").instanceId]);
    expect(s.state.players[0]!.security.every((card) => card.faceUp === false)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("secTop").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-029"]);
    assertNoLoudGap(s);
  });

  it("declining the optional On Play keeps the security stack and gains no memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-029", as: "tapir" },
            { card: "BT1-012", as: "spare" },
          ],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012"],
        },
        1: { security: INERT_SECURITY, deck: ["BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tapir").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("gains no memory when the security stack is empty, because the cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-029", as: "tapir" },
            { card: "BT1-012", as: "spare" },
          ],
          security: [],
          deck: ["BT1-012"],
        },
        1: { security: INERT_SECURITY, deck: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tapir").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("publicly digivolves from a yellow Lv.2 source for the printed cost of 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "ST22-01", as: "viximon" },
        hand: [{ card: "BT19-029", as: "tapir" }],
        security: [{ card: "BT1-009", as: "secTop" }],
        deck: [{ card: "BT1-012", as: "bonusDraw" }],
      },
      1: { security: INERT_SECURITY, deck: ["BT1-012"] },
    });
    s.state.memory = 0;
    await s.ready();
    const viximonId = s.inst("viximon").instanceId;
    const tapirId = s.inst("tapir").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("viximon").permanentId,
        instanceId: tapirId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === tapirId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([viximonId]);
    // The digivolution bonus draw is the only card that reaches the hand.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    // Digivolving in breeding is not "playing": the On Play cost is not paid.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secTop").instanceId]);
  });

  it("refuses an illegal off-colour Lv.2 source and an illegal same-level source", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        battleArea: [{ card: "BT19-029", as: "sameLevel" }],
        hand: [{ card: "BT19-029", as: "tapir" }],
        security: [{ card: "BT1-009", as: "secTop" }],
        deck: ["BT1-012"],
      },
      1: { security: INERT_SECURITY, deck: ["BT1-012"] },
    });
    s.state.memory = 5;
    await s.ready();
    const tapirId = s.inst("tapir").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redEgg").permanentId,
        instanceId: tapirId,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sameLevel").permanentId,
        instanceId: tapirId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([tapirId]);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("redEgg").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it.each([
    ["BT3-037", "Data"],
    ["BT26-022", "Witchelny"],
  ])(
    "prevents an opponent effect from removing a yellow %s host by trashing the top security card",
    async (hostCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: hostCard, as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
            security: [
              { card: "BT1-009", as: "secTop" },
              { card: "BT1-011", as: "secNext" },
            ],
            deck: ["BT1-012", "BT1-012"],
            hand: [{ card: "BT1-012", as: "spare" }],
          },
          1: {
            battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
            hand: [
              { card: "BT2-091", as: "flare" },
              { card: "BT1-012", as: "opponentSpare" },
            ],
            security: INERT_SECURITY,
            deck: ["BT1-012", "BT1-012"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await openMain(s, 0);
      closeMain(s, 0);
      await openMain(s, 1);

      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.length === 1);
      closeMain(s, 1);
      await stopLoop(s, loop, 1);

      // The host is still on the board with its digivolution card intact.
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([hostCard]);
      expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("tapir").instanceId]);
      // Exactly the TOP security card paid for it.
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("secTop").instanceId]);
      expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secNext").instanceId]);
      assertNoLoudGap(s);
    },
  );

  it("declining the prevention lets the opponent's effect delete the host and pays nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-037", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-029", "BT3-037"]);
  });

  it("prevents only once per turn and works again on the opponent's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-037", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secOne" },
            { card: "BT1-011", as: "secTwo" },
            { card: "BT1-012", as: "secThree" },
          ],
          deck: ["BT1-012", "BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flareOne" },
            { card: "BT2-091", as: "flareTwo" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareOne").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2);
    // Intermediate state: the first removal was prevented at the cost of one security card.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTwo").instanceId,
      s.inst("secThree").instanceId,
    ]);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareTwo").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    // The second removal in the same turn is NOT prevented, and costs no further security.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTwo").instanceId,
      s.inst("secThree").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT19-029", "BT3-037"]);
  });

  it("re-arms the once-per-turn prevention on the opponent's following turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-037", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secOne" },
            { card: "BT1-011", as: "secTwo" },
            { card: "BT1-012", as: "secThree" },
          ],
          deck: ["BT1-012", "BT1-012", "BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flareOne" },
            { card: "BT2-091", as: "flareTwo" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012", "BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareOne").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2);
    closeMain(s, 1);

    // Seat 0's own turn passes, then the opponent's next turn: a fresh once-per-turn window.
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareTwo").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT3-037"]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secThree").instanceId]);
  });

  it.each([
    ["BT1-051", "a yellow Vaccine peer that has neither the [Data] nor the [Witchelny] trait"],
    ["BT1-014", "a red [Data] peer that is not yellow"],
  ])("does not protect %s (%s)", async (hostCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: hostCard, as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-029", hostCard].sort());
  });

  it("protects only the Digimon carrying this card, not a matching sibling (Q3087)", async () => {
    // Both permanents are yellow [Data] Lv.4 Digimon; only `carrier` has Tapirmon underneath.
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-037", as: "carrier", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] },
            { card: "BT9-035", as: "sibling", dp: 4000 },
          ],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    // Aim the opponent's removal at the SIBLING, which carries no Tapirmon.
    preferInstanceIds.push(s.perm("sibling").topCard!.instanceId, s.perm("sibling").permanentId);
    const siblingTopId = s.perm("sibling").topCard!.instanceId;
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    // The sibling is gone and nothing was paid: the prevention is scoped to its own host.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("carrier").topCard!.instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([siblingTopId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
  });

  it("does not prevent a battle deletion, which is not an opponent's effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-037", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT6-038", as: "blocker", dp: 20_000, suspended: true }],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-029", "BT3-037"]);
  });

  it.each([
    ["BT19-029", "the Tapirmon prevention"],
    ["BT19-041", "the host's own [All Turns] clause"],
  ])("lets the player order simultaneous would-leave effects, resolving %s first (Q3095)", async (preferredCardId) => {
    // BT19-041 Dynasmon is a yellow [Data] Digimon whose own [All Turns] clause reacts to the
    // same "would leave" event. Q3095: both trigger simultaneously and the player picks the
    // order. Preferring one branch or the other produces two DIFFERENT, observable endpoints.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "host", dp: 4000, under: [{ card: "BT19-029", as: "tapir" }] }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: [{ card: "BT1-012", as: "deckTop" }, "BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentRedSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [preferredCardId] },
    );
    await s.ready();
    const deckTopId = s.inst("deckTop").instanceId;
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length > 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    // The host survives either way; ＜Recovery +1 (Deck)＞ adds a card and the prevention
    // trashes one, so the stack size is unchanged but its CONTENTS differ by resolve order.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-041"]);
    const trashedIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    const securityIds = s.state.players[0]!.security.map((card) => card.instanceId);
    // Prevention first: the printed top security card pays, then ＜Recovery +1＞ adds the deck
    // card. Recovery first: the deck card becomes the new top and is what the prevention pays.
    const expected =
      preferredCardId === "BT19-029"
        ? { trash: [s.inst("secTop").instanceId], security: [deckTopId, s.inst("secNext").instanceId] }
        : { trash: [deckTopId], security: [s.inst("secTop").instanceId, s.inst("secNext").instanceId] };
    expect({ trash: trashedIds, security: securityIds }).toEqual(expected);
  });
});
