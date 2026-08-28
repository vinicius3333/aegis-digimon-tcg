import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-112.js";

// Engine-level proof of the BT7-112 alternate-digivolve placement payment (KB Q1691):
// the CONTROLLER chooses WHICH 10 Tamer/[Hybrid] cards to place and their bottom-of-deck
// ORDER — the server no longer auto-picks the first 10 in hand-then-trash order.
//
// FAILS-WHEN-REVERTED: restore the deterministic slice(0, need) payment in GameEngine's
// payAlternatePlacement and the chosen-last-10-reversed selection below is ignored — the
// deck bottom holds the first 10 matching cards instead of the player's picks.

const SUSANOOMON = "BT7-112";
const TAMER = "BT7-089";
const HYBRID = "AD1-002";
const FILLER = "AD1-001";

describe("BT7-112 alternate digivolve — interactive placement payment (KB Q1691)", () => {
  it("places exactly the player's 10 chosen cards at the deck bottom in the chosen order", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: TAMER, as: "base" }],
        // 12 matching placement candidates (6 [Hybrid] in hand + 6 Tamers in trash): 2 more
        // than required, so which 10 leave is a real choice.
        hand: [{ card: SUSANOOMON, as: "evolver" }, HYBRID, HYBRID, HYBRID, HYBRID, HYBRID, HYBRID],
        trash: [TAMER, TAMER, TAMER, TAMER, TAMER, TAMER],
        // Seed the deck so the digivolve draw does not consume a placed card.
        deck: [FILLER, FILLER],
      },
    });
    const p0 = s.state.players[0]!;
    const base = s.perm("base");
    const evolver = s.inst("evolver");
    s.state.memory = 10;

    let placementChoice: string[] = [];

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: evolver.instanceId,
      permanentId: base.permanentId,
    });
    expect(res.ok).toBe(true);

    // The placement prompt: pick the LAST 10 offered candidates, REVERSED — a selection and
    // order the deterministic fallback could never produce.
    await settle(() => s.decisions.some((d) => d.req.kind === "selectCards" && d.req.options?.min === 10));
    const placementReq = s.decisions.find((d) => d.req.kind === "selectCards" && d.req.options?.min === 10)!;
    const candidates = placementReq.req.options?.candidateInstanceIds ?? [];
    placementChoice = candidates.slice(-10).reverse();
    s.engine.applyIntent(placementReq.seat, {
      type: "respondDecision",
      decisionId: placementReq.req.decisionId,
      response: { kind: "selectCards", instanceIds: placementChoice },
    });

    // Let the queued decision response and async digivolve resolution settle.
    await settle(() => base.topCard?.cardId === SUSANOOMON, 400);

    expect(base.topCard?.cardId).toBe(SUSANOOMON);
    expect(placementChoice).toHaveLength(10);

    // The deck bottom holds EXACTLY the chosen cards in the chosen order (1 filler was
    // drawn on digivolve, 1 remains on top).
    expect(p0.deck.slice(-10).map((c) => c.instanceId)).toEqual(placementChoice);

    // The 2 unchosen matching cards stayed behind in hand/trash.
    const remaining = [...p0.hand, ...p0.trash].filter((c) => c.cardId === HYBRID || c.cardId === TAMER);
    expect(remaining).toHaveLength(2);
    expect(remaining.every((c) => !placementChoice.includes(c.instanceId))).toBe(true);
  });
});
