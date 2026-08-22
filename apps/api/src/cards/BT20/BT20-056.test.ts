import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-056.js";

// A3 for BT20-056 (Alphamon — Black/White Lv.6 Digimon).
//
// [Static] ＜Barrier＞
// [On Play] ＜Recovery +1 (Deck)＞. Then, 1 of your Digimon in the breeding area may
//   digivolve into a level 6 or lower [Chronicle] trait Digimon in hand/trash without cost.
// [When Digivolving] Same as [On Play].
// [All Turns] [Once Per Turn] When security stacks are removed from, 1 of your opponent's
//   Digimon gets -8000 DP for the turn.
//
// FAILS-WHEN-REVERTED: [On Play] triggers Recovery — a card moves from the deck to security.

// BT20-056 = Alphamon (playCost 12, Lv.6)
const ALPHAMON = "BT20-056";
// BT20-010 = Ryudamon (Chronicle Lv.3) — valid breeding-digivolve target
const RYUDAMON = "BT20-010";
// BT1-010 = Agumon — cheap filler
const AGUMON = "BT1-010";

describe("BT20-056 Alphamon — On Play Recovery +1", () => {
  it("compiles Barrier, attack-gated breeding digivolution, and inherited protection", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.keywords).toContainEqual({ keyword: "Barrier", raw: "＜Barrier＞" });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions[1]).toMatchObject({ kind: "Digivolve", condition: { kind: "duringAttack" }, from: ["hand", "trash"], payCost: false });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", condition: { kind: "selfHasName", names: ["Alphamon: Ouryuken"] }, cost: { kind: "trashSecurityTop" } }] });
  });
  it("does not use the breeding-area digivolution clause outside an attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: ALPHAMON }, { card: RYUDAMON, as: "candidate" }],
          breeding: { card: RYUDAMON, as: "breeding" },
          deck: [AGUMON],
          security: [AGUMON],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    const alpha = s.state.players[0]!.hand.find((card) => card.cardId === ALPHAMON)!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: alpha.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe(RYUDAMON);
  });

  it("[On Play] ＜Recovery +1 (Deck)＞ — a card moves from deck to security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: ALPHAMON, as: "alphaInst" }],
          // Seat 0 deck has a card to recover.
          deck: [AGUMON],
          // Seat 0 security has 2 cards (below the 5-cap, so recovery will add one).
          security: [AGUMON, AGUMON],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const alphaInst = s.inst("alphaInst");

    const initialSecurityCount = p0.security.length;

    // Play Alphamon (cost 12 — set memory to 12).
    s.state.memory = 12;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: alphaInst.instanceId,
    });
    expect(res.ok).toBe(true);

    // After [On Play] resolves, security should have gained 1 card.
    await settle(() => p0.security.length > initialSecurityCount, 600);

    expect(p0.security.length).toBe(initialSecurityCount + 1);
  });

  it("[All Turns] when security is removed, opponent Digimon gets -8000 DP", async () => {
    const s = setupEngine(
      {
        // Alphamon on the battle area.
        0: { battleArea: [{ card: ALPHAMON, dp: 11000, as: "alphamonPerm" }] },
        1: {
          // An opponent Digimon with high DP so the -8000 modifier leaves it alive.
          // 10000 DP - 8000 = 2000 DP (positive, rule-process-safe).
          battleArea: [{ card: AGUMON, dp: 10000, as: "oppDigimon" }],
          // A security card so the removal event has a valid source.
          security: [AGUMON],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const alphamonPerm = s.perm("alphamonPerm");
    const oppDigimon = s.perm("oppDigimon");

    const initialDP = oppDigimon.currentDP;
    await advance(s.engine).recompute();
    expect(advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSecurityRemoved").some((entry) => entry.sourcePermanentId === alphamonPerm.permanentId)).toBe(true);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => oppDigimon.currentDP !== initialDP, 600);

    // DP should have dropped by 8000 (10000 -> 2000).
    expect(oppDigimon.currentDP).toBe(initialDP - 8000);
  });
});
