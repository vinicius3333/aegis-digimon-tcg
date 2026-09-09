import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-080 Takato Matsuki (Red Tamer, cost 4).
//
//   [Start of Your Turn] If you have 2 or less memory, set it to 3.
//   [Your Turn] When any of your Digimon digivolve into a Digimon with [Growlmon]/[Gallantmon]
//     in its name, by suspending this Tamer, that Digimon gains ＜Raid＞ for the turn.
//     Then, that Digimon attacks a player.
//   [Security] Play this card without paying the cost.
//
// KB Q3141: once ＜Raid＞ has been given, the attack is NOT optional — the Digimon must attack
// if it can. The suspend is the only choice point ("by suspending this Tamer").
//
// "in its name" is the printed SUBSTRING form, so `match: "name"` is correct here (a bracketed
// `[Name]` reference would need `namesExact`). WarGrowlmon therefore matches; Kokatorimon does not.

const TAKATO = "BT19-080";
const BASE_LV3 = "BT1-009"; // Monodramon, red Lv.3 — a legal source for the Lv.4 routes
const BASE_LV5 = "ST7-08"; // WarGrowlmon, red Lv.5 — a legal source for the Lv.6 Gallantmon
const GROWLMON = "BT2-013"; // vanilla red Growlmon Lv.4 (evo: red Lv.3, cost 2)
const GALLANTMON = "EX2-011"; // Gallantmon Lv.6, static DP only (evo: red Lv.5, cost 4)
const NEAR_MISS = "BT1-014"; // Kokatorimon, red Lv.4 (evo: red Lv.3, cost 2) — neither name
const FILLER = ["BT1-009", "BT1-010", "BT1-012", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-012", "BT1-013"];

describe("BT19-080 Takato Matsuki", () => {
  it("matches the catalog identity and printed clauses", () => {
    expect(getCardDefinition(TAKATO)).toMatchObject({
      nameEn: "Takato Matsuki",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 4,
      // NOTE: the catalog separates "[Gallantmon]" from "in its name" with U+00A0, and prints
      // "＜Raid＞for the turn" with no space after the keyword.
      effectText:
        "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n" +
        "[Your Turn] When any of your Digimon digivolve into a Digimon with [Growlmon]/[Gallantmon] in its " +
        "name, by suspending this Tamer, that Digimon gains ＜Raid＞for the turn. Then, that Digimon attacks a player.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("compiles memory setting, the Growlmon/Gallantmon Raid attack, and the Security play", () => {
    const card = runtimeCompiledCard(TAKATO);
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourTurn",
        actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOneOfYoursDigivolves",
            sourceFilter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              // "in its name" is the substring form; `match: "name"` is deliberate.
              nameOrTrait: [{ tokens: ["Growlmon", "Gallantmon"], match: "name" }],
            },
            actions: [
              {
                kind: "GainKeyword",
                keyword: { keyword: "Raid" },
                duration: "forTheTurn",
                optional: true,
                // Live, not dead: a second action follows, so declining the cost aborts it.
                abortOnDecline: true,
                target: { sourceRef: "triggerSubject" },
                cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
              },
              // Q3141: the attack carries no `optional`, so it cannot be declined.
              { kind: "Attack", attackPlayer: true, mandatory: true, target: { sourceRef: "triggerSubject" } },
            ],
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
    ]);
    const subTrigger = card?.effects?.[1]?.actions?.[0] as { actions?: { optional?: boolean }[] } | undefined;
    expect(subTrigger?.actions?.[1]?.optional).toBeUndefined();
  });

  // --- play cost -----------------------------------------------------------------------

  it("costs 4 memory to play from hand in a real Main phase", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: TAKATO, as: "takato" }, "BT1-009"], deck: [...FILLER], security: [...SECURITY] },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takato").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === TAKATO));

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
          battleArea: [{ card: TAKATO, as: "tamer" }],
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
          battleArea: [{ card: TAKATO, as: "tamer" }],
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
            { card: TAKATO, as: "securityTakato" },
            { card: "BT1-012", as: "securityFiller" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const takatoId = s.inst("securityTakato").instanceId;
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
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === takatoId));

    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([takatoId]);
    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([fillerId]);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).not.toContain(takatoId);
    expect(s.state.memory).toBe(3); // nothing paid the cost of 4
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
            { card: TAKATO, as: "securityTakato" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const takatoId = s.inst("securityTakato").instanceId;
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

    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([takatoId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  // --- [Your Turn] Raid + forced attack --------------------------------------------------

  it("grants ＜Raid＞ and attacks the player when a Digimon digivolves into a [Growlmon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BASE_LV3, as: "base" },
            { card: TAKATO, as: "tamer" },
          ],
          hand: [{ card: GROWLMON, as: "growlmon" }, "BT1-010"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const baseCardId = s.perm("base").topCard!.instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === SECURITY.length - 1);

    // The digivolved permanent kept its identity and stacked the Lv.3 underneath.
    expect(s.perm("base").topCard?.cardId).toBe(GROWLMON);
    expect(s.perm("base").stack.map((c) => c.instanceId)).toEqual([baseCardId]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(true);
    // The suspend cost was paid on the Tamer, and the attack suspended the attacker.
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("base").isSuspended).toBe(true);
    // The attack really hit the player: one security card checked, digivolve draw taken.
    expect(s.state.players[1]!.security).toHaveLength(SECURITY.length - 1);
    expect(
      s.events.some(
        (event) => event.kind === "attackDeclared" && event.attackerPermanentId === s.perm("base").permanentId,
      ),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("Q3141: the attack is mandatory — no decision is offered for it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BASE_LV3, as: "base" },
            { card: TAKATO, as: "tamer" },
          ],
          hand: [{ card: GROWLMON, as: "growlmon" }, "BT1-010"],
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
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === SECURITY.length - 1);

    // Exactly ONE optional prompt was raised for this clause: the "by suspending this Tamer"
    // cost. The attack that follows it never asks.
    expect(s.decisions.filter((d) => d.req.kind === "optional")).toHaveLength(1);
    expect(s.perm("base").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("declining the suspend cost aborts the whole clause: no ＜Raid＞ and no attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BASE_LV3, as: "base" },
            { card: TAKATO, as: "tamer" },
          ],
          hand: [{ card: GROWLMON, as: "growlmon" }, "BT1-010"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === GROWLMON);

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(SECURITY.length);
    assertNoLoudGap(s);
  });

  it("also fires for a [Gallantmon] digivolve off a real Lv.5 WarGrowlmon stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BASE_LV5, as: "base", under: [{ card: GROWLMON, as: "underGrowlmon" }] },
            { card: TAKATO, as: "tamer" },
          ],
          hand: [{ card: GALLANTMON, as: "gallantmon" }, "BT1-010"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const warGrowlmonId = s.perm("base").topCard!.instanceId;
    const underId = s.inst("underGrowlmon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === SECURITY.length - 1);

    expect(s.perm("base").topCard?.cardId).toBe(GALLANTMON);
    expect(s.perm("base").stack.map((c) => c.instanceId)).toEqual([underId, warGrowlmonId]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(SECURITY.length - 1);
    assertNoLoudGap(s);
  });

  it("near-miss: a Digimon with neither name in it does not fire the clause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BASE_LV3, as: "base" },
            { card: TAKATO, as: "tamer" },
          ],
          hand: [{ card: NEAR_MISS, as: "kokatorimon" }, "BT1-010"],
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
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kokatorimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === NEAR_MISS);

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(SECURITY.length);
    assertNoLoudGap(s);
  });

  it("[Your Turn]: an OPPONENT's Growlmon digivolve on their own turn does not fire it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAKATO, as: "tamer" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: BASE_LV3, as: "oppBase" }],
          hand: [{ card: GROWLMON, as: "oppGrowlmon" }, "BT1-010"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Seat 1's real turn, reached through the turn loop rather than by setting `turnSeat`.
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("oppBase").permanentId,
        instanceId: s.inst("oppGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("oppBase").topCard?.cardId === GROWLMON);

    expect(observe(s.engine).hasKeyword(s.perm("oppBase"), "Raid")).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(SECURITY.length);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
