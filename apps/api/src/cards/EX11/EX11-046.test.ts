import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js"; // register the compiled cards so the real activateEffect path runs

/**
 * A3 for EX11-046 (Galacticmon) — the [When Digivolving] mass-delete's survivor.
 *
 *   [On Play] [When Digivolving] Choose 1 of your opponent's highest play cost
 *   Digimon and delete all of their other Digimon.
 *
 * `Target.except` narrows its own survivor pool to the opponent's HIGHEST-play-cost
 * Digimon via `selector: "highestPlayCost"` (reusing the same superlative machinery
 * `Filter.superlative` already applies elsewhere). Before this fix the interpreter
 * never read `except`, so the delete matched EVERY opponent Digimon — including the
 * one with the highest play cost that the printed text spares.
 *
 * FAILS-WHEN-REVERTED: dropping the `except` carve-out makes the highest-play-cost
 * Digimon get deleted along with the rest, and the "survives" assertion below flips.
 */

const GALACTICMON = "EX11-046";
const GALACTICMON_BASE = "BT11-111"; // Lv.6 [Galacticmon], satisfies the alternate digivolve requirement
const OPPONENT_CHEAP = "AD1-011"; // playCost 8 — must be deleted (not the highest)
const OPPONENT_COSTLY = "AD1-004"; // playCost 12 — the highest, must survive

describe("EX11-046 — [When Digivolving] mass-delete spares the highest-play-cost opponent Digimon", () => {
  it("keeps the highest-play-cost opponent Digimon, deletes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON_BASE, as: "base" }],
          hand: [{ card: GALACTICMON, as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: OPPONENT_CHEAP, as: "cheap" },
            { card: OPPONENT_COSTLY, as: "costly" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    const base = s.perm("base");
    const cheap = s.perm("cheap");
    const costly = s.perm("costly");
    const evolving = s.inst("evolving");

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });

    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // The highest-play-cost opponent Digimon survives ...
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === costly.permanentId)).toBe(true);
    // ... while the cheaper one was deleted.
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === cheap.permanentId)).toBe(false);
  });

  it("grants Blocker when the evolving Digimon has at least 4 Vemmon in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: GALACTICMON_BASE,
              as: "base",
              under: ["BT11-061", "BT11-061", "BT11-061", "BT11-061"],
            },
          ],
          hand: [{ card: GALACTICMON, as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    const base = s.perm("base");
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: s.inst("evolving").instanceId });
    await settle(() => observe(s.engine).hasKeyword(base, "Blocker"));

    expect(base.topCard?.cardId).toBe(GALACTICMON);
    expect(base.stack.filter((card) => card.cardId === "BT11-061")).toHaveLength(4);
    expect(observe(s.engine).hasKeyword(base, "Blocker")).toBe(true);
  });
});
