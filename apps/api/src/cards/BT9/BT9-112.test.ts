import { describe, it, expect } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-112.js";
import "./BT9-112.js";

// A3 for BT9-112 (DeathXmon) — self ＜when played＞ cost reduction SCALED by a matching-card count
// (no payment, no condition — the fourth reducer shape this fix unlocks):
//   "When you would play this card from your hand, reduce its memory cost by 3 for each Digimon
//   and Tamer card your opponent has in play." (KB Q1928: total count, not pairs)
//
// Before the fix, `wouldBePlayedSelfReducersFor` only ever captured a structured-Cost reducer; a
// scaling-only reducer with no cost/condition at all was never extracted, so this shape was fully
// inert. The fix adds a dedicated automatic condition/scaling branch consulting `scaleFactor`.
//
// FAILS-WHEN-REVERTED: without the fix the scaling is never applied and the FULL cost (20) is
// paid regardless of the opponent's board.

const BT9_112 = "BT9-112"; // cost 20
const OPP_DIGIMON = "BT1-030"; // Gomamon
const OPP_TAMER = "BT10-093"; // Yuu Amano

describe("BT9-112 ＜when played＞ cost reduction (-3 per opponent Digimon/Tamer, automatic)", () => {
  it("matches catalog values and scaled cost, mass-effect, and end-turn IR", () => {
    expect(getCardDefinition("BT9-112")).toMatchObject({
      colors: ["Purple", "Black"], kinds: ["Digimon"], level: 7, playCost: 20, dp: 15000,
      evoCosts: [{ color: "Black", level: 6, memoryCost: 6 }, { color: "Purple", level: 6, memoryCost: 6 }], types: ["Unanalyzable", "X Program"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", scaling: { unit: "cards", per: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } }, actions: [{ kind: "Replacement", mode: "reduceCost", amount: 3 }] }] },
        { trigger: "OnPlay", actions: [{ kind: "DeDigivolve", amount: 1, target: { count: "all" } }, { kind: "Delete", target: { count: "all", filter: { levelComparison: { op: "lte", value: 4 } } } }] },
        { trigger: "WhenDigivolving", actions: [{ kind: "DeDigivolve", amount: 1 }, { kind: "Delete" }] },
        { trigger: "EndOfOpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { count: "all", filter: { superlative: "lowestPlayCost" } } }] },
      ],
    });
  });

  it("plays for 0 with 7 opposing Digimon even when the controller has 0 memory", async () => {
    const s = setupEngine({
      0: { hand: [{ card: BT9_112, as: "card" }] },
      1: {
        battleArea: Array.from({ length: 7 }, () => ({ card: OPP_DIGIMON, dp: 3000 })),
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("card").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === BT9_112));

    expect(s.state.memory).toBe(0);
  });

  it("plays at cost 14 (20 - 3*2) with 2 opponent Digimon/Tamer cards in play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: BT9_112, as: "card" }] },
      1: {
        battleArea: [
          { card: OPP_DIGIMON, dp: 3000 },
          { card: OPP_TAMER, dp: 3000 },
        ],
      },
    });
    const p0 = s.state.players[0]!;
    s.state.memory = 14; // exactly the reduced cost — no decision requests wired at all

    const card = s.inst("card");
    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === BT9_112) && s.state.memory === 0, 400);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === BT9_112)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("plays at the full cost (20) with an empty opponent board", async () => {
    const s = setupEngine({ 0: { hand: [{ card: BT9_112, as: "card" }] } });
    const p0 = s.state.players[0]!;
    s.state.memory = 20; // the FULL cost, not the reduced one

    const card = s.inst("card");
    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === BT9_112) && s.state.memory === 0, 400);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === BT9_112)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("on play de-digivolves every opponent Digimon, then deletes all resulting level 4 or lower", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: BT9_112, as: "deathX" }] },
        1: {
          battleArea: [
            { card: "BT9-078", as: "fallsToLevel4", under: ["BT7-062"] },
            { card: "BT9-078", as: "staysLevel5" },
            { card: "BT7-062", as: "alreadyLevel4" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deathX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT9-078");
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT7-062")).toHaveLength(2);
  });

  it("when digivolving from a legal level-6 base, de-digivolves then deletes resulting level 4 or lower", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-068", as: "base" }],
          hand: [{ card: BT9_112, as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT9-078", as: "fallsToLevel4", under: ["BT7-062"] },
            { card: "BT9-078", as: "staysLevel5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT9-078");
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT9-078")).toHaveLength(1);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT7-062")).toHaveLength(1);
  });

  it("at the end of the opponent's turn deletes every Digimon tied for lowest play cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: BT9_112, as: "deathX" }] },
      1: {
        battleArea: [
          { card: "BT1-016", as: "low1" },
          { card: "BT1-016", as: "low2" },
          { card: "BT9-078", as: "high" },
        ],
      },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("deathX"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("high").topCard.cardId).toBe("BT9-078");
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-016")).toHaveLength(2);
  });
});
