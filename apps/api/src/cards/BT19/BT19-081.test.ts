import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-081 Kiriha Aonuma (Blue Tamer, cost 3, [General]/[Blue Flare]).
//
//   [Start of Your Main Phase] By placing 1 Digimon card with the [Blue Flare]/[Xros Heart]
//     trait from your hand under any of your Tamers, gain 1 memory.
//   [All Turns] When any of your [Blue Flare] trait Digimon cards with DigiXros requirements
//     would be played, by suspending this Tamer, you may place cards from under your Tamers
//     as digivolution cards for a DigiXros.
//   [Security] Play this card without paying the cost.
//
// KB: Q3142 (under-Tamer is ADDED to the normal hand/battle-area sources), Q3143 (the material
// may sit under any of your Tamers), Q3144 (it applies to every qualifying play, not once
// per turn).

const KIRIHA = "BT19-081";
const TAKATO = "BT19-080"; // a plain red Tamer: a legal HOST that is not an expander itself
const BT10_KIRIHA = "BT10-088"; // Kiriha Aonuma — REGISTERED expander, no trait gate
const TAIKI = "BT19-079"; // Taiki Kudo — REGISTERED expander gated on [Xros Heart], not [Blue Flare]
const BLUE_FLARE = "BT19-020"; // Greymon, Blue, L4, [Dinosaur]/[Blue Flare]
const XROS_HEART = "BT10-008"; // Shoutmon, L3, [Mini Dragon]/[Xros Heart]
const PLAIN = "BT1-009"; // Monodramon, [Mini Dragon] — neither printed trait
const XROS_BF = "BT19-025"; // MetalGreymon, [Blue Flare], DigiXros -2: Blue [Greymon] x [MailBirdramon]
const XROS_MAT_A = "BT19-020"; // Greymon (Blue) — fills the [Greymon] slot
const XROS_MAT_B = "BT19-022"; // MailBirdramon (Blue) — fills the [MailBirdramon] slot
const FILLER = ["BT1-009", "BT1-010", "BT1-012", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-012", "BT1-013"];

describe("BT19-081 Kiriha Aonuma", () => {
  it("matches the catalog print this audit reads from", () => {
    expect(getCardDefinition(KIRIHA)).toMatchObject({
      cardId: KIRIHA,
      nameEn: "Kiriha Aonuma",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["General", "Blue Flare"],
      effectText:
        // NOTE: the catalog separates each bracketed trait ref from "trait" with U+00A0.
        "[Start of Your Main Phase] By placing 1 Digimon card with the [Blue Flare]/[Xros Heart]\u00A0trait from your " +
        "hand under any of your Tamers, gain 1 memory.\n" +
        "[All Turns] When any of your [Blue Flare]\u00A0trait Digimon cards with DigiXros requirements would be played, " +
        "by suspending this Tamer, you may place cards from under your Tamers as digivolution cards for a DigiXros.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(getCardDefinition(KIRIHA)?.inheritedEffectText).toBeUndefined();
  });

  it("keeps the hand placement, the DigiXros zone expansion and the security play in the record", () => {
    const card = runtimeCompiledCard(KIRIHA);
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            // "By placing …," is the controller's choice (comprehensive 15-7-4).
            optional: true,
            cost: {
              kind: "place",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  // "with the […] trait" is EXACT, never a substring.
                  nameOrTrait: [{ tokens: ["Blue Flare", "Xros Heart"], match: "trait" }],
                },
                from: ["hand"],
                count: 1,
              },
              underFilter: { controller: "mine", kind: ["Tamer"] },
            },
          },
        ],
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
              nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }],
              hasDigiXrosRequirements: true,
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

  // --- play cost ------------------------------------------------------------------------

  it("costs 3 memory to play from hand in a real Main phase", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: KIRIHA, as: "kiriha" }, PLAIN], deck: [...FILLER], security: [...SECURITY] },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kiriha").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === KIRIHA));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual([PLAIN]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual([KIRIHA]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  // --- [Start of Your Main Phase] --------------------------------------------------------

  it("[Start of Your Main Phase] places a [Blue Flare] hand card under this Tamer and gains 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KIRIHA, as: "kiriha" }],
          hand: [{ card: BLUE_FLARE, as: "bf" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const bfId = s.inst("bf").instanceId;

    const turn = s.engine.runOneTurn();
    // Read INSIDE the open Main phase: after runTurn returns, the turn has already passed.
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("kiriha").stack.map((c) => c.instanceId)).toEqual([bfId]);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual([PLAIN]);
    expect(s.state.memory).toBe(6); // 5 + 1
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("[Start of Your Main Phase] also accepts an [Xros Heart] card, and declining pays nothing", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [{ card: KIRIHA, as: "kiriha" }],
          hand: [{ card: XROS_HEART, as: "xh" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    accepted.state.memory = 5;
    await accepted.ready();
    const xhId = accepted.inst("xh").instanceId;

    const acceptedTurn = accepted.engine.runOneTurn();
    await advance(accepted.engine).waitForMainPhase(0);
    expect(accepted.perm("kiriha").stack.map((c) => c.instanceId)).toEqual([xhId]);
    expect(accepted.state.memory).toBe(6);
    advance(accepted.engine).endMainPhaseIfOpen(0);
    await acceptedTurn;
    assertNoLoudGap(accepted);

    // Same board, same hand — the controller simply refuses the paid condition.
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: KIRIHA, as: "kiriha" }],
          hand: [{ card: XROS_HEART, as: "xh" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    declined.state.memory = 5;
    await declined.ready();

    const declinedTurn = declined.engine.runOneTurn();
    await advance(declined.engine).waitForMainPhase(0);
    expect(declined.perm("kiriha").stack.map((c) => c.instanceId)).toEqual([]);
    expect(declined.state.players[0]!.hand.map((c) => c.cardId).sort()).toEqual([PLAIN, XROS_HEART].sort());
    expect(declined.state.memory).toBe(5); // no memory gained without the placement
    advance(declined.engine).endMainPhaseIfOpen(0);
    await declinedTurn;
    assertNoLoudGap(declined);
  });

  it("[Start of Your Main Phase] near miss: a hand Digimon with neither printed trait cannot pay it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KIRIHA, as: "kiriha" }],
          // BT1-009 Monodramon is [Mini Dragon]: no [Blue Flare], no [Xros Heart].
          hand: [{ card: PLAIN, as: "plain" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const plainId = s.inst("plain").instanceId;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("kiriha").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([plainId]);
    expect(s.state.memory).toBe(5);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("[Start of Your Main Phase] near miss: a [Blue Flare] card in the TRASH is not a legal source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KIRIHA, as: "kiriha" }],
          hand: [{ card: PLAIN, as: "plain" }],
          // "from your hand" — the same card sitting in the trash must not pay the cost.
          trash: [{ card: BLUE_FLARE, as: "trashedBf" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const trashedId = s.inst("trashedBf").instanceId;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("kiriha").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([trashedId]);
    expect(s.state.memory).toBe(5);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("[Start of Your Main Phase] can host the card under a DIFFERENT Tamer (“any of your Tamers”)", async () => {
    const hostPreference: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: KIRIHA, as: "kiriha" },
            { card: TAKATO, as: "host" },
          ],
          hand: [{ card: BLUE_FLARE, as: "bf" }, PLAIN],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: hostPreference },
    );
    s.state.memory = 5;
    await s.ready();
    const bfId = s.inst("bf").instanceId;
    const hostId = s.perm("host").permanentId;
    // Bias the host choice toward the OTHER Tamer. A `chooseTargets` for a permanent
    // destination carries PERMANENT ids, not top-card instance ids.
    hostPreference.push(hostId);

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    // The card landed under BT19-080, not under BT19-081 itself.
    expect(s.perm("host").stack.map((c) => c.instanceId)).toEqual([bfId]);
    expect(s.perm("kiriha").stack.map((c) => c.instanceId)).toEqual([]);
    expect(hostId).not.toBe(s.perm("kiriha").permanentId);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual([PLAIN]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  // --- [Security] -----------------------------------------------------------------------

  it("[Security] plays itself for free through a real security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "attacker" }], deck: [...FILLER], security: [...SECURITY] },
        1: {
          security: [
            { card: KIRIHA, as: "securityKiriha" },
            { card: "BT1-012", as: "securityFiller" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const kirihaId = s.inst("securityKiriha").instanceId;
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
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === kirihaId));

    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([kirihaId]);
    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([fillerId]);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).not.toContain(kirihaId);
    // Nothing paid its cost of 3: only the attacker's own memory swing happened.
    expect(s.state.memory).toBe(3);
    expect(s.perm("attacker").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("[Security] control: an unchecked BT19-081 stays face down and plays nothing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-015", as: "attacker" }], deck: [...FILLER], security: [...SECURITY] },
        1: {
          security: [
            { card: "BT1-012", as: "securityFiller" },
            { card: KIRIHA, as: "securityKiriha" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const kirihaId = s.inst("securityKiriha").instanceId;
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

    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([kirihaId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  // --- [All Turns] DigiXros source-zone expansion -----------------------------------------

  it("Q3142 baseline: hand materials remain legal for a [Blue Flare] DigiXros with no expander", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KIRIHA, as: "kiriha" }],
          hand: [
            { card: XROS_BF, as: "xros" },
            { card: XROS_MAT_A, as: "matA" },
            { card: XROS_MAT_B, as: "matB" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3; // 7 - 2 - 2
    await s.ready();
    const matA = s.inst("matA").instanceId;
    const matB = s.inst("matB").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: { materialInstanceIds: [matA, matB] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_BF));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_BF);
    expect(played?.stack.map((c) => c.instanceId).sort()).toEqual([matA, matB].sort());
    expect(s.state.memory).toBe(0);
    // The normal source needed no Tamer, so nothing was suspended.
    expect(s.perm("kiriha").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("peer control: BT10-088, which IS registered, legalizes an under-Tamer material for the same play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BT10_KIRIHA, as: "expander", under: [{ card: XROS_MAT_A, as: "under" }] }],
          hand: [
            { card: XROS_BF, as: "xros" },
            { card: XROS_MAT_B, as: "matB" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const underId = s.inst("under").instanceId;
    const matB = s.inst("matB").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [underId, matB],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_BF));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_BF);
    expect(played?.stack.map((c) => c.instanceId).sort()).toEqual([underId, matB].sort());
    expect(s.perm("expander").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.perm("expander").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  // Q3142/Q3143 at the real seam. The permission is consumed by the DigiXros play subsystem,
  // which reads the static registry in `packages/shared/src/cards/zoneExpanders.ts`
  // (`DIGIXROS_ZONE_EXPANDERS` / `digiXrosZoneExpanderFor`) whenever a play intent names
  // `expanderPermanentIds` (`apps/api/src/engine/actions/digiXros.ts`). BT19-081 is registered
  // there with the [Blue Flare] gate, `underTamerMax: 100` and no `underTamerHostScope`, so the
  // material may sit under ANY of this player's Tamers (Q3143) — here, under BT19-080, a Tamer
  // that could never legalize the play on its own.
  it("Q3142/Q3143: an under-Tamer material is legal when BT19-081 is suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: KIRIHA, as: "kiriha" },
            { card: TAKATO, as: "host", under: [{ card: XROS_MAT_A, as: "under" }] },
          ],
          hand: [
            { card: XROS_BF, as: "xros" },
            { card: XROS_MAT_B, as: "matB" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const underId = s.inst("under").instanceId;
    const matB = s.inst("matB").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [underId, matB],
          expanderPermanentIds: [s.perm("kiriha").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS_BF));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS_BF);
    expect(played?.stack.map((c) => c.instanceId).sort()).toEqual([underId, matB].sort());
    expect(s.perm("host").stack.map((c) => c.instanceId)).toEqual([]);
    expect(s.perm("host").isSuspended).toBe(false); // the HOST is never the one suspended
    expect(s.perm("kiriha").isSuspended).toBe(true);
  });

  it("without naming any expander, an under-Tamer material is illegal for every seat", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KIRIHA, as: "kiriha", under: [{ card: XROS_MAT_A, as: "under" }] }],
          hand: [
            { card: XROS_BF, as: "xros" },
            { card: XROS_MAT_B, as: "matB" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const underId = s.inst("under").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [underId, s.inst("matB").instanceId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("kiriha").stack.map((c) => c.instanceId)).toEqual([underId]);
    expect(s.state.memory).toBe(3);
  });

  it("the trait gate is per registration: BT19-079's [Xros Heart] gate refuses this [Blue Flare] card", async () => {
    // BT19-025 MetalGreymon is [Cyborg]/[Blue Flare] — exactly what BT19-081's clause names and
    // exactly what BT19-079's clause does not. The refusal is what a correct BT19-081
    // registration would have to invert.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAIKI, as: "expander", under: [{ card: XROS_MAT_A, as: "under" }] }],
          hand: [
            { card: XROS_BF, as: "xros" },
            { card: XROS_MAT_B, as: "matB" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const underId = s.inst("under").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: {
          materialInstanceIds: [underId, s.inst("matB").instanceId],
          expanderPermanentIds: [s.perm("expander").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
    expect(s.perm("expander").stack.map((c) => c.instanceId)).toEqual([underId]);
    expect(s.perm("expander").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
  });
});
