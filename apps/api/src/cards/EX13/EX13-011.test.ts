import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
// EX13/index.ts is coordinator-owned and does not list this module yet, so the test registers it.
import "./EX13-011.js";

const CARD_ID = "EX13-011";
const MON = "EX13-075";
/** A Tamer whose name merely CONTAINS "Mon" — the near miss for the `nameExact` filter. */
const MONICA = "BT25-091";
/** Red Lv.3 without [Huckmon] in its text: the primary (non-alternate) evolution base. */
const RED_BASE = "EX13-007";
/** White Lv.3 WITH [Huckmon] in its text: only the alternate route accepts it. */
const HUCKMON_TEXT_BASE = "BT7-082";
/** Blue Lv.3 with neither red nor [Huckmon] in text: both routes must refuse it. */
const ILLEGAL_BASE = "BT1-027";
/** Inert filler with no [Huckmon] text, so Mon's own reveal adds nothing. */
const FILLER = "BT1-012";

describe("EX13-011 BaoHuckmon", () => {
  it("compiles Raid, both free-play windows and the inherited +2000 DP", () => {
    const card = runtimeCompiledCard(CARD_ID);
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Raid" }] },
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Mon"], match: "nameExact" }] } },
            condition: { kind: "permanentCount", seat: "mine", filter: { kind: ["Tamer"] }, op: "lte", value: 1 },
          },
        ],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Mon"], match: "nameExact" }] } },
            condition: { kind: "permanentCount", seat: "mine", filter: { kind: ["Tamer"] }, op: "lte", value: 1 },
          },
        ],
      },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { count: 1, isSelf: true } }],
      },
    ]);
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { level: 3, texts: ["Huckmon"], cost: 2, isAlternate: true },
    ]);
  });

  it("digivolves for 2 over a red Lv.3 and resolves When Digivolving publicly", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: RED_BASE, as: "base" }],
          hand: [
            { card: CARD_ID, as: "baoHuckmon" },
            { card: MON, as: "mon" },
          ],
          deck: [FILLER, FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("baoHuckmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === MON));

    expect(s.perm("base").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([RED_BASE]);
    // Digivolving charges 2 memory; the free play charges nothing on top of it.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([FILLER]);
    expect(
      s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === MON).map(({ stack }) => stack.length),
    ).toEqual([0]);
  });

  it("takes the alternate route over a non-red Lv.3 with [Huckmon] in its text and refuses other bases", async () => {
    const legal = setupEngine(
      {
        0: {
          battleArea: [{ card: HUCKMON_TEXT_BASE, as: "base" }],
          hand: [{ card: CARD_ID, as: "baoHuckmon" }],
          deck: [FILLER, FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    legal.state.memory = 2;

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("baoHuckmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === CARD_ID);
    expect(legal.perm("base").stack.map(({ cardId }) => cardId)).toEqual([HUCKMON_TEXT_BASE]);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: ILLEGAL_BASE, as: "base" }],
        hand: [{ card: CARD_ID, as: "baoHuckmon" }],
        deck: [FILLER],
      },
    });
    illegal.state.memory = 2;
    for (const useAlternateCost of [true, false]) {
      expect(
        illegal.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: illegal.perm("base").permanentId,
          instanceId: illegal.inst("baoHuckmon").instanceId,
          useAlternateCost,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
    }
    expect(illegal.perm("base").topCard.cardId).toBe(ILLEGAL_BASE);
  });

  it("plays Mon for free on play with exactly one existing Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "existingTamer" }],
          hand: [
            { card: CARD_ID, as: "baoHuckmon" },
            { card: MON, as: "mon" },
          ],
          deck: [FILLER, FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("baoHuckmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === MON));

    // 5 memory less BaoHuckmon's printed play cost of 5; Mon (cost 4) is free.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      ["BT1-085", CARD_ID, MON].sort(),
    );
  });

  it("plays Mon for free with zero existing Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "baoHuckmon" }],
          hand: [{ card: MON, as: "mon" }],
          deck: [FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("baoHuckmon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === MON));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === MON)).toBe(true);
  });

  it("offers nothing once a second Tamer is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "baoHuckmon" },
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT1-087", as: "secondTamer" },
          ],
          hand: [{ card: MON, as: "mon" }],
          deck: [FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("baoHuckmon"));
    await settle();

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([MON]);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === MON)).toBe(false);
    expect(s.decisions.some(({ req }) => req.kind === "optional" || req.kind === "selectCards")).toBe(false);
  });

  it("matches [Mon] exactly and ignores a Tamer whose name merely contains Mon", async () => {
    const discriminating = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "baoHuckmon" }],
          hand: [
            { card: MONICA, as: "monica" },
            { card: MON, as: "mon" },
          ],
          deck: [FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(discriminating.engine).fire(EffectTiming.OnPlay, discriminating.perm("baoHuckmon"));
    await settle(() => discriminating.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === MON));

    expect(discriminating.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      discriminating.inst("monica").instanceId,
    ]);

    const nearMissOnly = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "baoHuckmon" }],
          hand: [{ card: MONICA, as: "monica" }],
          deck: [FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(nearMissOnly.engine).fire(EffectTiming.OnPlay, nearMissOnly.perm("baoHuckmon"));
    await settle();

    expect(nearMissOnly.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([MONICA]);
    expect(nearMissOnly.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(nearMissOnly.decisions.some(({ req }) => req.kind === "optional" || req.kind === "selectCards")).toBe(false);
  });

  it("may decline the free Mon play while the condition holds", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "baoHuckmon" }],
          hand: [{ card: MON, as: "mon" }],
          deck: [FILLER, FILLER, FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("baoHuckmon"));
    await settle();

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([MON]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
  });

  it("keeps Raid printed and on an inheriting host, and scopes +2000 DP to that host on its own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "printed" },
          { card: "BT1-014", as: "host", under: [CARD_ID] },
          { card: "BT1-014", as: "control" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("printed"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(false);
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("control").currentDP).toBe(4000);
    expect(s.perm("printed").currentDP).toBe(5000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("redirects its own attack to the opponent's highest-DP unsuspended Digimon via Raid", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "raider" }] },
        1: {
          battleArea: [
            { card: "BT1-013", as: "low", dp: 3000 },
            { card: "BT1-013", as: "high", dp: 20_000 },
          ],
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared"));
    await settle();

    expect(s.events.filter((event) => event.kind === "attackDeclared").at(-1)).toMatchObject({
      target: { kind: "permanent", permanentId: s.perm("high").permanentId },
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
