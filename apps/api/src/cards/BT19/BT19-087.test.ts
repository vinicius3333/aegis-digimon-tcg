import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-087 Nene Amano (Black Tamer, cost 4, [General]/[Twilight]).
//
//   [Start of Your Turn] If you have 2 memory or less, set your memory to 3.
//   [All Turns] When any of your [Composite]/[Twilight] trait Digimon cards with DigiXros
//     requirements would be played, by suspending this Tamer, 1 card under your Tamers and
//     1 card in your trash can also be placed for their DigiXros.
//   [Security] Play this card without paying the cost.
//
// KB: Q3152 (the gate is [Composite] OR [Twilight] cards that have DigiXros requirements),
// Q3153 (under-Tamer/trash are ADDED to the normal hand + battle-area sources, and either
// area may be used alone), Q3154 (the material may sit under any of your Tamers, not only
// this one), Q3155 (it applies to each qualifying play, not once per turn), Q3156/Q3157
// (two copies suspended stack their per-zone quotas, on one play or across several).
//
// The expansion is consumed by the DigiXros play subsystem: `packages/shared/src/cards/
// zoneExpanders.ts` registers BT19-087 with `appliesTo: hasAnyTrait(["Composite","Twilight"])`,
// `underTamerMax: 1` and `trashMax: 1`; `engine/actions/digiXros.ts` reads that registry when
// the play intent names `expanderPermanentIds`, summing the quotas across named expanders.

const NENE = "BT19-087"; // the expander Tamer
const KIRIHA = "BT10-088"; // peer expander: no trait gate, under-Tamer only, single host
const TAKATO = "BT19-080"; // a plain Tamer — a HOST that is not itself an expander
const RYO = "BT19-086"; // a BT19 Tamer with no memory clause at all — the peer control

const XROS_COMPOSITE = "BT10-009"; // Shoutmon X4, [Composite], cost 9, DigiXros -2, 4 slots
const XROS_TWILIGHT = "BT10-066"; // DarkKnightmon, [Twilight], cost 8, DigiXros -2, 2 slots
const NOT_GATED = "BT10-077"; // MadLeomon, [Bagra Army] only, cost 5, DigiXros -2

const SHOUTMON = "BT10-008";
const BALLISTAMON = "BT10-049";
const DORULUMON = "BT10-034";
const STARMONS = "BT10-029";
const SKULLKNIGHTMON = "BT7-058";
const DEADLYAXEMON = "BT7-059";

const FILLER = ["BT1-009", "BT1-010", "BT1-012", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-012", "BT1-013"];

describe("BT19-087 Nene Amano", () => {
  it("matches the catalog identity and printed clauses", () => {
    expect(getCardDefinition(NENE)).toMatchObject({
      nameEn: "Nene Amano",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["General", "Twilight"],
      effectText:
        "[Start of Your Turn] If you have 2 memory or less, set your memory to 3.\n" +
        // NOTE: the catalog separates "[Twilight]" from "trait" with U+00A0, not a plain space.
        "[All Turns] When any of your [Composite]/[Twilight]\u00A0trait Digimon cards with DigiXros requirements " +
        "would be played, by suspending this Tamer, 1 card under your Tamers and 1 card in your trash can also " +
        "be placed for their DigiXros.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("keeps memory reset, the wouldBePlayed zone expansion, and security play in the runtime record", () => {
    const card = runtimeCompiledCard(NENE);
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourTurn",
        actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
      },
      {
        // Trap check: the printed clause is [All Turns], so the trigger must be `AllTurns`,
        // and the clause is a would-be-played REPLACEMENT, not a bare optional action.
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            mode: "instead",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Composite", "Twilight"], match: "trait" }],
              hasDigiXrosRequirement: true,
            },
            actions: [
              {
                kind: "DigiXrosMaterialZoneExpansion",
                zones: ["underTamers", "trash"],
                duration: "forTheTurn",
                cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
              },
            ],
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
    ]);
  });

  it("registers the 1-under-Tamer + 1-trash quota keyed to the [Composite]/[Twilight] gate", async () => {
    const { digiXrosZoneExpanderFor } = await import("@aegis/shared");
    const expander = digiXrosZoneExpanderFor(NENE)!;
    expect(expander.underTamerMax).toBe(1);
    expect(expander.trashMax).toBe(1);
    expect(expander.underTamerHostScope).toBeUndefined(); // Q3154: any of your Tamers
    expect(expander.appliesTo(getCardDefinition(XROS_COMPOSITE)!)).toBe(true);
    expect(expander.appliesTo(getCardDefinition(XROS_TWILIGHT)!)).toBe(true);
    expect(expander.appliesTo(getCardDefinition(NOT_GATED)!)).toBe(false);
  });

  // --- Tamer play cost -------------------------------------------------------------------

  it("costs 4 memory to play from hand in a real Main phase", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: NENE, as: "nene" }, "BT1-009"], deck: [...FILLER], security: [...SECURITY] },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nene").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === NENE));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  // --- [Start of Your Turn] --------------------------------------------------------------

  it("[Start of Your Turn] sets memory to 3 from 2, read inside the open Main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NENE, as: "nene" }],
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
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("[Start of Your Turn] also fires at exactly 2 memory but never lowers memory from above 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NENE, as: "nene" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(6);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("peer control: with no BT19-087 on the board, memory stays at 2 through the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: RYO, as: "ryo" }],
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

  // --- [Security] ------------------------------------------------------------------------

  it("[Security] plays itself for free through a real security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "attacker" }], deck: [...FILLER], security: [...SECURITY] },
        1: {
          security: [
            { card: NENE, as: "securityNene" },
            { card: "BT1-012", as: "securityFiller" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const neneId = s.inst("securityNene").instanceId;
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
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === neneId));

    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([neneId]);
    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([fillerId]);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).not.toContain(neneId);
    // Nothing paid the printed cost of 4: only the attacker's own swing moved memory.
    expect(s.state.memory).toBe(3);
    expect(s.perm("attacker").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("the other security outcome: a plain card is trashed and BT19-087 stays face down", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "attacker" }], deck: [...FILLER], security: [...SECURITY] },
        1: {
          security: [
            { card: "BT1-012", as: "securityFiller" },
            { card: NENE, as: "securityNene" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const neneId = s.inst("securityNene").instanceId;
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

    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([neneId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  // --- [All Turns] DigiXros zone expansion ------------------------------------------------

  it("Q3153: hand and battle-area materials stay legal with no expander named at all", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NENE, as: "nene" }],
          hand: [
            { card: XROS_COMPOSITE, as: "xros" },
            { card: SHOUTMON, as: "handMaterial" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7; // 9 - 2 (one material)
    const materialId = s.inst("handMaterial").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: { materialInstanceIds: [materialId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_COMPOSITE));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_COMPOSITE);
    expect(played?.stack.map((c) => c.instanceId)).toEqual([materialId]);
    expect(s.state.memory).toBe(0);
    expect(s.perm("nene").isSuspended).toBe(false); // the normal sources never pay the cost
    assertNoLoudGap(s);
  });

  it("Q3153: 1 under-Tamer AND 1 trash card are both placed on one [Composite] DigiXros", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NENE, as: "nene", under: [{ card: SHOUTMON, as: "under" }] }],
          hand: [{ card: XROS_COMPOSITE, as: "xros" }],
          trash: [{ card: BALLISTAMON, as: "trashed" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5; // 9 - 2*2
    const underId = s.inst("under").instanceId;
    const trashedId = s.inst("trashed").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [underId, trashedId],
          expanderPermanentIds: [s.perm("nene").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_COMPOSITE));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_COMPOSITE);
    expect(played?.stack.map((c) => c.instanceId).sort()).toEqual([underId, trashedId].sort());
    expect(s.perm("nene").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(trashedId);
    expect(s.perm("nene").isSuspended).toBe(true); // the printed suspend cost was paid
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("Q3152: the same expansion works for a [Twilight] DigiXros card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NENE, as: "nene", under: [{ card: SKULLKNIGHTMON, as: "under" }] }],
          hand: [{ card: XROS_TWILIGHT, as: "xros" }],
          trash: [{ card: DEADLYAXEMON, as: "trashed" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4; // 8 - 2*2
    const underId = s.inst("under").instanceId;
    const trashedId = s.inst("trashed").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [underId, trashedId],
          expanderPermanentIds: [s.perm("nene").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_TWILIGHT));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_TWILIGHT);
    expect(played?.stack.map((c) => c.instanceId).sort()).toEqual([underId, trashedId].sort());
    expect(s.perm("nene").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("Q3153: either area alone is enough — a trash card with nothing under the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NENE, as: "nene" }],
          hand: [{ card: XROS_COMPOSITE, as: "xros" }],
          trash: [{ card: SHOUTMON, as: "trashed" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    const trashedId = s.inst("trashed").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [trashedId],
          expanderPermanentIds: [s.perm("nene").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_COMPOSITE));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_COMPOSITE);
    expect(played?.stack.map((c) => c.instanceId)).toEqual([trashedId]);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(trashedId);
    expect(s.perm("nene").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("without naming BT19-087 as the expander, the same trash material is illegal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NENE, as: "nene" }],
          hand: [{ card: XROS_COMPOSITE, as: "xros" }],
          trash: [{ card: SHOUTMON, as: "trashed" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    const trashedId = s.inst("trashed").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: { materialInstanceIds: [trashedId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual([NENE]);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([trashedId]);
    expect(s.perm("nene").isSuspended).toBe(false);
    expect(s.state.memory).toBe(9);
  });

  it("an already-suspended BT19-087 cannot pay the cost again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NENE, as: "nene", suspended: true }],
          hand: [{ card: XROS_COMPOSITE, as: "xros" }],
          trash: [{ card: SHOUTMON, as: "trashed" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("trashed").instanceId],
          expanderPermanentIds: [s.perm("nene").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
    expect(s.state.memory).toBe(9);
  });

  // --- the printed 1 + 1 caps --------------------------------------------------------------

  it("enforces the trash maximum of 1: two trash materials are rejected", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NENE, as: "nene" }],
          hand: [{ card: XROS_COMPOSITE, as: "xros" }],
          trash: [
            { card: SHOUTMON, as: "t1" },
            { card: BALLISTAMON, as: "t2" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("t1").instanceId, s.inst("t2").instanceId],
          expanderPermanentIds: [s.perm("nene").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("nene").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("enforces the under-Tamer maximum of 1: two under-Tamer materials are rejected", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: NENE,
              as: "nene",
              under: [
                { card: SHOUTMON, as: "u1" },
                { card: BALLISTAMON, as: "u2" },
              ],
            },
          ],
          hand: [{ card: XROS_COMPOSITE, as: "xros" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    const u1 = s.inst("u1").instanceId;
    const u2 = s.inst("u2").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [u1, u2],
          expanderPermanentIds: [s.perm("nene").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("nene").isSuspended).toBe(false);
    expect(s.perm("nene").stack.map((c) => c.instanceId)).toEqual([u1, u2]);
  });

  // --- Q3154 host scope --------------------------------------------------------------------

  it("Q3154: the material may sit under a DIFFERENT Tamer than the one suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NENE, as: "nene" },
            { card: TAKATO, as: "host", under: [{ card: SHOUTMON, as: "under" }] },
          ],
          hand: [{ card: XROS_COMPOSITE, as: "xros" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    const underId = s.inst("under").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: { materialInstanceIds: [underId], expanderPermanentIds: [s.perm("nene").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_COMPOSITE));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_COMPOSITE);
    expect(played?.stack.map((c) => c.instanceId)).toEqual([underId]);
    expect(s.perm("host").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.perm("nene").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false); // the HOST is never the one suspended
    assertNoLoudGap(s);
  });

  it("near-miss: naming the plain host Tamer as the expander is rejected", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NENE, as: "nene" },
            { card: TAKATO, as: "host", under: [{ card: SHOUTMON, as: "under" }] },
          ],
          hand: [{ card: XROS_COMPOSITE, as: "xros" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("under").instanceId],
          expanderPermanentIds: [s.perm("host").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
    expect(s.perm("nene").isSuspended).toBe(false);
  });

  // --- Q3152 trait gate, with a peer control ------------------------------------------------

  it("Q3152: a DigiXros card with neither [Composite] nor [Twilight] is refused", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NENE, as: "nene" }],
          hand: [{ card: NOT_GATED, as: "bagra" }],
          trash: [{ card: NOT_GATED, as: "trashed" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("bagra").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("trashed").instanceId],
          expanderPermanentIds: [s.perm("nene").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
    expect(s.perm("nene").isSuspended).toBe(false);
  });

  it("peer control: BT10-088 Kiriha (no trait gate, under-Tamer only) legalizes the same [Bagra Army] play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KIRIHA, as: "kiriha", under: [{ card: NOT_GATED, as: "under" }] }],
          hand: [{ card: NOT_GATED, as: "bagra" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3; // 5 - 2 (one material)
    const underId = s.inst("under").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("bagra").instanceId,
        digiXros: { materialInstanceIds: [underId], expanderPermanentIds: [s.perm("kiriha").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === NOT_GATED));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === NOT_GATED);
    expect(played?.stack.map((c) => c.instanceId)).toEqual([underId]);
    expect(s.perm("kiriha").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("peer control: Kiriha's clause opens no trash quota, so the same trash material is still illegal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KIRIHA, as: "kiriha" }],
          hand: [{ card: XROS_COMPOSITE, as: "xros" }],
          trash: [{ card: SHOUTMON, as: "trashed" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("trashed").instanceId],
          expanderPermanentIds: [s.perm("kiriha").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  // --- Q3155 / Q3156 / Q3157 stacking --------------------------------------------------------

  it("Q3156: two copies suspended on ONE play raise the quotas to 2 under-Tamer + 2 trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NENE, as: "neneA", under: [{ card: SHOUTMON, as: "u1" }] },
            { card: NENE, as: "neneB", under: [{ card: BALLISTAMON, as: "u2" }] },
          ],
          hand: [{ card: XROS_COMPOSITE, as: "xros" }],
          trash: [
            { card: DORULUMON, as: "t1" },
            { card: STARMONS, as: "t2" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1; // 9 - 4*2
    const ids = ["u1", "u2", "t1", "t2"].map((alias) => s.inst(alias).instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: ids,
          expanderPermanentIds: [s.perm("neneA").permanentId, s.perm("neneB").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_COMPOSITE));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_COMPOSITE);
    expect(played?.stack.map((c) => c.instanceId).sort()).toEqual([...ids].sort());
    expect(s.perm("neneA").isSuspended).toBe(true);
    expect(s.perm("neneB").isSuspended).toBe(true);
    expect(s.perm("neneA").stack).toHaveLength(0);
    expect(s.perm("neneB").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(ids[2]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("Q3156 near-miss: with only ONE copy suspended those same 4 materials exceed the quotas", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NENE, as: "neneA", under: [{ card: SHOUTMON, as: "u1" }] },
            { card: NENE, as: "neneB", under: [{ card: BALLISTAMON, as: "u2" }] },
          ],
          hand: [{ card: XROS_COMPOSITE, as: "xros" }],
          trash: [
            { card: DORULUMON, as: "t1" },
            { card: STARMONS, as: "t2" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    const ids = ["u1", "u2", "t1", "t2"].map((alias) => s.inst(alias).instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: ids,
          expanderPermanentIds: [s.perm("neneA").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("neneA").isSuspended).toBe(false);
    expect(s.perm("neneB").isSuspended).toBe(false);
  });

  it("Q3155/Q3157: the clause applies again to a second qualifying play in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NENE, as: "neneA", under: [{ card: SHOUTMON, as: "u1" }] },
            { card: NENE, as: "neneB", under: [{ card: SKULLKNIGHTMON, as: "u2" }] },
          ],
          hand: [{ card: XROS_COMPOSITE, as: "xrosA" }, { card: XROS_TWILIGHT, as: "xrosB" }, "BT1-009"],
          trash: [
            { card: BALLISTAMON, as: "t1" },
            { card: DEADLYAXEMON, as: "t2" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9; // 5 for Shoutmon X4, then 4 for DarkKnightmon
    await s.ready();
    const u1 = s.inst("u1").instanceId;
    const t1 = s.inst("t1").instanceId;
    const u2 = s.inst("u2").instanceId;
    const t2 = s.inst("t2").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xrosA").instanceId,
        digiXros: { materialInstanceIds: [u1, t1], expanderPermanentIds: [s.perm("neneA").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_COMPOSITE));
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xrosB").instanceId,
        digiXros: { materialInstanceIds: [u2, t2], expanderPermanentIds: [s.perm("neneB").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_TWILIGHT));

    const first = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_COMPOSITE);
    const second = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_TWILIGHT);
    expect(first?.stack.map((c) => c.instanceId).sort()).toEqual([u1, t1].sort());
    expect(second?.stack.map((c) => c.instanceId).sort()).toEqual([u2, t2].sort());
    expect(s.perm("neneA").isSuspended).toBe(true);
    expect(s.perm("neneB").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
