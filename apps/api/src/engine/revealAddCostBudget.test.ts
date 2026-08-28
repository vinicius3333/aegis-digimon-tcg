import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "./testkit/harness.js";
// Self-register every compiled-IR card module so the engine can look up BT11-044's On Play.
import "../cards/index.js";

/**
 * A3 behavioral proof for the RevealAdd `costBudget` capability (BT11-044).
 *
 * BT11-044 [On Play]: "Reveal the top 4 cards of your deck. You may play any number of
 * Digimon cards with [Chuumon], [Sukamon], or [Etemon] in their names whose total play
 * costs add up to 7 or less among them without paying the costs. Trash the rest."
 *
 * Proves: (1) the controller may play a subset whose SUMMED play cost <= 7 for free, and
 * (2) an over-budget selection is enforced server-side (the excess is rejected, not played),
 * with the rest trashed.
 *
 * Revealed top 4 (budget 7): Chuumon BT11-036 (cost 3), Sukamon BT11-040 (cost 3),
 * Etemon BT11-041 (cost 7), and a non-matching Digimon (AD1-001) that is always trashed.
 *
 * FAILS-WHEN-REVERTED: drop the `spec.costBudget` branch in interpreter.ts `runRevealAdd`
 * and BT11-044 falls back to `count: "all"` (plays ALL matches for free, ignoring the
 * budget) — Test 2's assertion that Etemon is NOT played turns RED.
 */

const SOURCE = "BT11-044"; // MetalEtemon, playCost 11
const CHUUMON = "BT11-036"; // cost 3, no On Play
const SUKAMON = "BT11-040"; // cost 3, no On Play
const ETEMON = "BT11-041"; // cost 7, has On Play (never played in these tests)
const FILLER = "AD1-001"; // Digimon, not a matching name -> always trashed

function inPlay(p: PlayerState, cardId: string): boolean {
  return p.battleArea.some((perm) => perm.topCard?.cardId === cardId);
}
function inTrash(p: PlayerState, instanceId: string): boolean {
  return p.trash.some((c) => c.instanceId === instanceId);
}

/**
 * Answer the RevealAdd budget prompt (a `selectCards`/`chooseTargets` decision) with exactly
 * the candidates whose cardId is in `chooseCardIds`; any other such prompt takes the max
 * allowed. `setupEngine`'s `autoSelectCards` opt can only take-the-max, so this drives the
 * response directly through the Test Seam's exposed `engine`/`decisions`, mirroring what
 * `autoSelectCards` does internally but with a cardId-aware filter.
 */
async function driveBudgetSelection(
  s: EngineSetup,
  idToCard: Map<string, string>,
  chooseCardIds: string[],
  predicate: () => boolean,
): Promise<void> {
  const answered = new Set<string>();
  for (let i = 0; i < 300 && !predicate(); i++) {
    for (const d of s.decisions) {
      if (answered.has(d.req.decisionId)) continue;
      if (d.req.kind !== "selectCards" && d.req.kind !== "chooseTargets") continue;
      answered.add(d.req.decisionId);
      const candidates = d.req.options?.candidateInstanceIds ?? [];
      const budgetPick = candidates.filter((id) => chooseCardIds.includes(idToCard.get(id) ?? ""));
      const ids = budgetPick.length > 0 ? budgetPick : candidates.slice(0, d.req.options?.max ?? candidates.length);
      s.engine.applyIntent(d.seat, {
        type: "respondDecision",
        decisionId: d.req.decisionId,
        response:
          d.req.kind === "selectCards"
            ? { kind: "selectCards", instanceIds: ids }
            : { kind: "chooseTargets", instanceIds: ids },
      });
    }
    await Promise.resolve();
  }
}

/** Lay the source in hand and the four reveal targets on top of deck. */
function board() {
  return {
    0: {
      hand: [{ card: SOURCE, as: "source" }],
      deck: [
        { card: CHUUMON, as: "chuumon", faceUp: false },
        { card: SUKAMON, as: "sukamon", faceUp: false },
        { card: ETEMON, as: "etemon", faceUp: false },
        { card: FILLER, as: "filler", faceUp: false },
      ],
    },
  };
}

describe("RevealAdd costBudget — total-play-cost budget free plays (BT11-044)", () => {
  it("plays a within-budget subset (3+3<=7) for free and trashes the rest", async () => {
    const s = setupEngine(board(), { autoAcceptOptional: true, autoChooseOption: true });
    s.state.memory = 11; // afford the hard play of the cost-11 source
    const p0 = s.state.players[0] as PlayerState;
    const idToCard = new Map<string, string>([
      [s.inst("chuumon").instanceId, CHUUMON],
      [s.inst("sukamon").instanceId, SUKAMON],
      [s.inst("etemon").instanceId, ETEMON],
      [s.inst("filler").instanceId, FILLER],
    ]);
    const etemonId = s.inst("etemon").instanceId;
    const fillerId = s.inst("filler").instanceId;
    const chooseCardIds = [CHUUMON, SUKAMON];

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });

    await driveBudgetSelection(s, idToCard, chooseCardIds, () => inPlay(p0, CHUUMON) && inPlay(p0, SUKAMON));
    // The free plays land first; the "trash the rest" tail runs on the next continuation.
    await settle(() => inTrash(p0, etemonId) && inTrash(p0, fillerId), 5000);

    // Both within-budget matches were played for free.
    expect(inPlay(p0, CHUUMON)).toBe(true);
    expect(inPlay(p0, SUKAMON)).toBe(true);
    // The un-picked Etemon and the non-matching filler were trashed (rest -> trash).
    expect(inPlay(p0, ETEMON)).toBe(false);
    expect(inTrash(p0, etemonId)).toBe(true);
    expect(inTrash(p0, fillerId)).toBe(true);
    // Exactly one budget-selection prompt was surfaced.
    const selectPrompts = s.decisions.filter((d) => d.req.kind === "selectCards");
    expect(selectPrompts.length).toBe(1);
  });

  it("rejects an over-budget selection server-side (3+3+7>7): the excess is not played", async () => {
    const s = setupEngine(board(), { autoAcceptOptional: true, autoChooseOption: true });
    s.state.memory = 11; // afford the hard play of the cost-11 source
    const p0 = s.state.players[0] as PlayerState;
    const idToCard = new Map<string, string>([
      [s.inst("chuumon").instanceId, CHUUMON],
      [s.inst("sukamon").instanceId, SUKAMON],
      [s.inst("etemon").instanceId, ETEMON],
      [s.inst("filler").instanceId, FILLER],
    ]);
    const etemonId = s.inst("etemon").instanceId;
    const fillerId = s.inst("filler").instanceId;
    // The client tries to take ALL three matches (3+3+7 = 13 > budget 7).
    const chooseCardIds = [CHUUMON, SUKAMON, ETEMON];

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });

    await driveBudgetSelection(s, idToCard, chooseCardIds, () => inPlay(p0, CHUUMON) && inPlay(p0, SUKAMON));
    await settle(() => inTrash(p0, etemonId) && inTrash(p0, fillerId), 5000);

    // The two cheap matches fit the budget and were played free.
    expect(inPlay(p0, CHUUMON)).toBe(true);
    expect(inPlay(p0, SUKAMON)).toBe(true);
    // Etemon pushed the total over budget, so the server rejected it: NOT played, trashed instead.
    expect(inPlay(p0, ETEMON)).toBe(false);
    expect(inTrash(p0, etemonId)).toBe(true);
    expect(inTrash(p0, fillerId)).toBe(true);
  });
});
