import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-079 Taiki Kudo (Red Tamer, cost 4, [General]/[Xros Heart]).
//
//   [Start of Your Turn] If you have 2 or less memory, set it to 3.
//   [All Turns] When any of your [Xros Heart] trait Digimon cards with DigiXros requirements
//     would be played, by suspending this Tamer, you may place cards from under your Tamers
//     as digivolution cards for a DigiXros.
//   [Security] Play this card without paying the cost.
//
// KB: Q3138 (under-Tamer is ADDED to the normal hand/battle-area sources), Q3139 (any of your
// Tamers hosts, not only this one), Q3140 (fires for each played card, not once per turn).
//
// The zone expansion is consumed by the DigiXros play subsystem: `packages/shared/src/cards/
// zoneExpanders.ts` registers BT19-079 with `appliesTo: hasAnyTrait(["Xros Heart"])`,
// `underTamerMax: 100` and no `underTamerHostScope`, and `engine/actions/digiXros.ts` reads
// that registry when the play intent names `expanderPermanentIds`.

const TAIKI = "BT19-079"; // the expander Tamer
const TAKATO = "BT19-080"; // a plain red Tamer — a HOST that is not itself an expander
const KIRIHA = "BT10-088"; // peer expander with NO trait gate (appliesTo: () => true)
const XROS = "BT10-009"; // [Xros Heart] Shoutmon X4, DigiXros -2, cost 9
const XROS_CHEAP = "BT11-009"; // [Xros Heart] Shoutmon + StarSword, DigiXros -1, cost 5
const NOT_XROS = "BT10-077"; // [Bagra Army] MadLeomon, DigiXros -2, cost 5 — no [Xros Heart]
const SHOUTMON = "BT10-008"; // "Shoutmon" — fills a slot of both XROS and XROS_CHEAP
const BAGRA = "BT10-077"; // itself carries [Bagra Army]; fills NOT_XROS's single trait slot
const FILLER = ["BT1-009", "BT1-010", "BT1-012", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-012", "BT1-013"];

describe("BT19-079 Taiki Kudo", () => {
  it("matches the catalog identity and printed clauses", () => {
    expect(getCardDefinition(TAIKI)).toMatchObject({
      nameEn: "Taiki Kudo",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["General", "Xros Heart"],
      // NOTE: the catalog separates "[Xros Heart]" from "trait" with U+00A0, not a plain space.
      effectText:
        "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n" +
        "[All Turns] When any of your [Xros Heart]\u00A0trait Digimon cards with DigiXros requirements would be " +
        "played, by suspending this Tamer, you may place cards from under your Tamers as digivolution cards for " +
        "a DigiXros.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("keeps memory reset, DigiXros expansion, and security play in the runtime record", () => {
    const card = runtimeCompiledCard(TAIKI);
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourTurn",
        actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
      },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            mode: "instead",
            optional: true,
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
              hasDigiXrosRequirement: true,
            },
            actions: [
              {
                kind: "DigiXrosMaterialZoneExpansion",
                zones: ["underTamers"],
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

  // --- play cost -----------------------------------------------------------------------

  it("costs 4 memory to play from hand in a real Main phase", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: TAIKI, as: "taiki" }, "BT1-009"], deck: [...FILLER], security: [...SECURITY] },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("taiki").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === TAIKI));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(["BT1-009"]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  // --- [Start of Your Turn] memory ------------------------------------------------------

  it("[Start of Your Turn] sets memory to 3 from 2, read inside the open Main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, as: "taiki" }],
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

  it("[Start of Your Turn] leaves memory alone when it is already above 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, as: "taiki" }],
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

  // --- [Security] ----------------------------------------------------------------------

  it("[Security] plays itself for free through a real security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "attacker" }], deck: [...FILLER], security: [...SECURITY] },
        1: {
          security: [
            { card: TAIKI, as: "securityTaiki" },
            { card: "BT1-012", as: "securityFiller" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const taikiId = s.inst("securityTaiki").instanceId;
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
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === taikiId));

    // The checked Tamer is on seat 1's board, not in security and not in the trash...
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([taikiId]);
    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([fillerId]);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).not.toContain(taikiId);
    // ...and nothing paid its cost of 4: only the attacker's own memory swing happened.
    expect(s.state.memory).toBe(3);
    expect(s.perm("attacker").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("the other security outcome: a card with no [Security] clause is simply trashed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "attacker" }], deck: [...FILLER], security: [...SECURITY] },
        1: {
          security: [
            { card: "BT1-012", as: "securityFiller" },
            { card: TAIKI, as: "securityTaiki" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const taikiId = s.inst("securityTaiki").instanceId;
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

    // Only the top card was checked; BT19-079 stayed face down in security and played nothing.
    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([taikiId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  // --- [All Turns] DigiXros source-zone expansion ----------------------------------------

  it("Q3138: hand and battle-area materials remain legal with no expander at all", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, as: "taiki" }],
          hand: [
            { card: XROS, as: "xros" },
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
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS);
    expect(played?.stack.map((c) => c.instanceId)).toEqual([materialId]);
    expect(s.state.memory).toBe(0);
    // The normal source did not need the Tamer, so nothing was suspended.
    expect(s.perm("taiki").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("with BT19-079 suspended, an under-Tamer material is legal and lands as a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, as: "taiki", under: [{ card: SHOUTMON, as: "under" }] }],
          hand: [{ card: XROS, as: "xros" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    const tamerId = s.perm("taiki").permanentId;
    const underId = s.inst("under").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: { materialInstanceIds: [underId], expanderPermanentIds: [tamerId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS);
    expect(played?.stack.map((c) => c.instanceId)).toEqual([underId]);
    expect(s.perm("taiki").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.perm("taiki").isSuspended).toBe(true); // the printed suspend cost was paid
    expect(s.state.memory).toBe(0); // 9 - 2 = 7 paid
    assertNoLoudGap(s);
  });

  it("without suspending BT19-079, the same under-Tamer material is illegal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, as: "taiki", under: [{ card: SHOUTMON, as: "under" }] }],
          hand: [{ card: XROS, as: "xros" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    const underId = s.inst("under").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: { materialInstanceIds: [underId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS)).toBe(false);
    expect(s.perm("taiki").stack.map((c) => c.instanceId)).toEqual([underId]);
    expect(s.state.memory).toBe(9);
  });

  it("an already-suspended BT19-079 cannot pay the cost again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, as: "taiki", suspended: true, under: [{ card: SHOUTMON, as: "under" }] }],
          hand: [{ card: XROS, as: "xros" }],
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
          expanderPermanentIds: [s.perm("taiki").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
  });

  it("Q3139: the material may sit under a DIFFERENT Tamer than the one being suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAIKI, as: "taiki" },
            // BT19-080 Takato Matsuki is a plain red Tamer with no expander registration:
            // it can host the material but could never legalize it on its own.
            { card: TAKATO, as: "host", under: [{ card: SHOUTMON, as: "under" }] },
          ],
          hand: [{ card: XROS, as: "xros" }],
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
        digiXros: { materialInstanceIds: [underId], expanderPermanentIds: [s.perm("taiki").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS);
    expect(played?.stack.map((c) => c.instanceId)).toEqual([underId]);
    expect(s.perm("host").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.perm("taiki").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false); // the HOST is never the one suspended
    assertNoLoudGap(s);
  });

  it("Q3139 near-miss: naming the non-expander host Tamer as the expander is rejected", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAIKI, as: "taiki" },
            { card: TAKATO, as: "host", under: [{ card: SHOUTMON, as: "under" }] },
          ],
          hand: [{ card: XROS, as: "xros" }],
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
    expect(s.perm("taiki").isSuspended).toBe(false);
  });

  it("Q3140: it applies again to a second DigiXros play in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAIKI, as: "taikiA", under: [{ card: SHOUTMON, as: "underA" }] },
            { card: TAIKI, as: "taikiB", under: [{ card: SHOUTMON, as: "underB" }] },
          ],
          hand: [{ card: XROS, as: "xrosA" }, { card: XROS_CHEAP, as: "xrosB" }, "BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12; // 7 for Shoutmon X4, then 4 for Shoutmon + StarSword
    const underA = s.inst("underA").instanceId;
    const underB = s.inst("underB").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xrosA").instanceId,
        digiXros: { materialInstanceIds: [underA], expanderPermanentIds: [s.perm("taikiA").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS));
    expect(s.state.memory).toBe(5);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xrosB").instanceId,
        digiXros: { materialInstanceIds: [underB], expanderPermanentIds: [s.perm("taikiB").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_CHEAP));

    const first = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS);
    const second = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_CHEAP);
    expect(first?.stack.map((c) => c.instanceId)).toEqual([underA]);
    expect(second?.stack.map((c) => c.instanceId)).toEqual([underB]);
    expect(s.perm("taikiA").isSuspended).toBe(true);
    expect(s.perm("taikiB").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  // --- trait gate, with a peer control --------------------------------------------------

  it("the [Xros Heart] gate rejects a DigiXros card without that trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, as: "taiki", under: [{ card: BAGRA, as: "under" }] }],
          hand: [{ card: NOT_XROS, as: "bagra" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("bagra").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("under").instanceId],
          expanderPermanentIds: [s.perm("taiki").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
    expect(s.perm("taiki").isSuspended).toBe(false);
  });

  it("peer control: BT10-088 Kiriha, whose clause has no trait gate, legalizes the same play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KIRIHA, as: "kiriha", under: [{ card: BAGRA, as: "under" }] }],
          hand: [{ card: NOT_XROS, as: "bagra" }],
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
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === NOT_XROS));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === NOT_XROS);
    expect(played?.stack.map((c) => c.instanceId)).toEqual([underId]);
    expect(s.perm("kiriha").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
