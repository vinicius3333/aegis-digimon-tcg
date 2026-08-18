import { describe, it, expect } from "vitest";
// Importing the cards barrel self-registers every compiled-IR module (boot side-effect),
// so the engine can look up the static effects exercised below.
import "../cards/index.js";
import { setupEngine, type BoardSpec } from "./testkit/harness.js";
import { extractPermanentAt } from "./state/access.js";

/**
 * Proof that the continuous-effect application lifecycle
 * (GameEngine.recomputeContinuousEffects) actually FIRES the `EffectTiming.None`
 * persistent (static) effects and re-derives them clear-then-recompute — the
 * unblocker for the ~134 cards whose IR parsed fine but had no static lifecycle.
 *
 * BT2-031 (base DP 12000): "[Your Turn] While your opponent has a Digimon with no
 * digivolution cards in play, this Digimon gets +1000 DP and ＜Security Attack +1＞."
 * — a `EffectTiming.None`-timing persistent (Aura) effect. Each test arranges the
 * gate (your turn + a stackless opponent Digimon) so the +1000 leg is live.
 */
const STATIC_DP_CARD = "BT2-031";
const STATIC_DP_BASE = 12000;
const OPPONENT_GATE_CARD = "BT1-019";

/**
 * Satisfy BT2-031's `while` gate: the opponent controls a Digimon with no digivolution
 * cards (a freshly placed permanent has an empty stack).
 */
function boardWithOpponentGate(): BoardSpec {
  return { 1: { battleArea: [OPPONENT_GATE_CARD] } };
}

describe("continuous-effect application lifecycle", () => {
  it.each([
    ["keyword source before dependent", ["BT2-055", "BT5-068"]],
    ["dependent before keyword source", ["BT5-068", "BT2-055"]],
  ])("resolves keyword-dependent inherited auras regardless of stack order: %s", async (_label, under) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-064", as: "host", under }] },
    });

    await s.ready();

    expect(s.perm("host").keywords).toContain("Reboot");
    expect(s.perm("host").currentDP).toBe(14_000);
  });

  it("applies a static self +DP from a clean slate", async () => {
    const s = setupEngine(boardWithOpponentGate());
    const perm = s.putOnBoard(0, { card: STATIC_DP_CARD, dp: STATIC_DP_BASE });

    await s.engine.recomputeContinuousEffects();
    expect(perm.currentDP).toBe(STATIC_DP_BASE + 1000);
  });

  it("is idempotent — re-running does NOT stack the static buff", async () => {
    const s = setupEngine(boardWithOpponentGate());
    const perm = s.putOnBoard(0, { card: STATIC_DP_CARD, dp: STATIC_DP_BASE });

    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();
    expect(perm.currentDP).toBe(STATIC_DP_BASE + 1000); // not +3000
  });

  it("lapses the static buff once the source leaves the field", async () => {
    const s = setupEngine(boardWithOpponentGate());
    const perm = s.putOnBoard(0, { card: STATIC_DP_CARD, dp: STATIC_DP_BASE });

    await s.engine.recomputeContinuousEffects();
    expect(perm.currentDP).toBe(STATIC_DP_BASE + 1000);

    // Source leaves play; the persistent buff must clear on the next recompute. The
    // detached object keeps its last currentDP, so prove the lapse with a fresh
    // permanent of the same card: it re-derives exactly +1000 (no leftover stacking).
    const p0 = s.state.players[0]!;
    extractPermanentAt(p0, 0);
    await s.engine.recomputeContinuousEffects();
    const fresh = s.putOnBoard(0, { card: STATIC_DP_CARD, dp: STATIC_DP_BASE });
    await s.engine.recomputeContinuousEffects();
    expect(fresh.currentDP).toBe(STATIC_DP_BASE + 1000);
  });
});
