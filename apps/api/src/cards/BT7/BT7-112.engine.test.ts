import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-112.js";

const SUSANOOMON = "BT7-112";
const TAMER = "BT7-089";
const HYBRID = "AD1-002";
const FILLER = "AD1-001";

describe("BT7-112 alternate digivolve — interactive placement payment (KB Q1691)", () => {
  it("places exactly the player's 10 chosen cards at the deck bottom in the chosen order", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: TAMER, as: "base" }],
        hand: [{ card: SUSANOOMON, as: "evolver" }, HYBRID, HYBRID, HYBRID, HYBRID, HYBRID, HYBRID],
        trash: [TAMER, TAMER, TAMER, TAMER, TAMER, TAMER],
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

    await settle(() => s.decisions.some((d) => d.req.kind === "selectCards" && d.req.options?.min === 10));
    const placementReq = s.decisions.find((d) => d.req.kind === "selectCards" && d.req.options?.min === 10)!;
    const candidates = placementReq.req.options?.candidateInstanceIds ?? [];
    placementChoice = candidates.slice(-10).reverse();
    s.engine.applyIntent(placementReq.seat, {
      type: "respondDecision",
      decisionId: placementReq.req.decisionId,
      response: { kind: "selectCards", instanceIds: placementChoice },
    });

    await settle(() => base.topCard?.cardId === SUSANOOMON, 400);

    expect(base.topCard?.cardId).toBe(SUSANOOMON);
    expect(placementChoice).toHaveLength(10);

    expect(p0.deck.slice(-10).map((c) => c.instanceId)).toEqual(placementChoice);

    const remaining = [...p0.hand, ...p0.trash].filter((c) => c.cardId === HYBRID || c.cardId === TAMER);
    expect(remaining).toHaveLength(2);
    expect(remaining.every((c) => !placementChoice.includes(c.instanceId))).toBe(true);
  });
});
