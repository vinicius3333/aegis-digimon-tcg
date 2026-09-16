import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const TAIKI = "BT19-079";
const TAKATO = "BT19-080";
const KIRIHA = "BT10-088";
const XROS = "BT10-009";
const XROS_CHEAP = "BT11-009";
const NOT_XROS = "BT10-077";
const SHOUTMON = "BT10-008";
const BAGRA = "BT10-077";
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

    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([taikiId]);
    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([fillerId]);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).not.toContain(taikiId);
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

    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([taikiId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

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
    s.state.memory = 7;
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
    expect(s.perm("taiki").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
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
    expect(s.perm("host").isSuspended).toBe(false);
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
    s.state.memory = 12;
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
    s.state.memory = 3;
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
