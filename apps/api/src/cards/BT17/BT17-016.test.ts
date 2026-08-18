import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * A3 for BT17-016's `[When Digivolving][When Attacking]` clause:
 * "Delete 1 of your opponent's Digimon with 8000 DP or less. If this effect didn't
 * delete, this Digimon gets +3000 DP and gains ＜Blocker＞ until the end of your
 * opponent's turn."
 *
 * Q1e (regression contract): same root cause as BT16-013 — the committed corpus compiled
 * "If this effect didn't delete" to a bare `{kind:"raw"}` condition the interpreter's
 * `raw` case doesn't recognize (falls through to `default: return false`), so the
 * +3000 DP / Blocker bonus never fired even when the Delete genuinely found no target.
 * `parse-condition.mjs` now emits the structured `ifThisEffectDidNotDelete`.
 *
 * Unlike BT16-013, this card's Delete and the conditional follow-up are BOTH direct
 * actions of the same `WhenDigivolving` trigger (no SubTrigger indirection), so they
 * share one resolution context — `ctx.lastDeleteCount` set by the Delete is read
 * correctly by the very next action in the same list. Confirmed by the negative
 * control below: unlike BT16-013, a successful delete correctly withholds the bonus.
 *
 * FAILS-WHEN-REVERTED: recompiling with the pre-fix parse-condition.mjs reinstates the
 * raw fallback's `return false`, and the positive assertion goes red (no DP/Blocker
 * bonus even though nothing was deleted).
 */
describe("BT17-016 [When Digivolving] delete-outcome gate: didn't-delete grants +3000 DP / Blocker", () => {
  it("grants +3000 DP and Blocker when the Delete finds no eligible opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", dp: 5000, as: "base" }],
          hand: [{ card: "BT17-016", as: "src" }],
        },
        1: { battleArea: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const base = s.perm("base");
    const src = s.inst("src");
    s.state.memory = 10;

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: src.instanceId });
    await settle(() => base.currentDP !== base.baseDP);
    // The DP bump (ModifyDP) and the keyword grant (GainKeyword) are two sequential actions in
    // the same action list; the DP settle above only guarantees the FIRST has landed. Let the
    // rest of the resolution queue flush before checking the keyword.
    await settle(() => false, 40);

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(base.currentDP).toBe(base.baseDP + 3000);
    expect(continuous.hasKeyword(base.permanentId, "Blocker")).toBe(true);
  });

  it("negative control: does NOT grant the bonus when the Delete actually removes a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", dp: 5000, as: "base" }],
          hand: [{ card: "BT17-016", as: "src" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 2000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const base = s.perm("base");
    const src = s.inst("src");
    s.state.memory = 10;

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: src.instanceId });
    await settle(() => (s.state.players[1]?.battleArea.length ?? 0) === 0);
    await settle(() => false, 40);

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(base.currentDP).toBe(base.baseDP);
    expect(continuous.hasKeyword(base.permanentId, "Blocker")).toBe(false);
  });
});
