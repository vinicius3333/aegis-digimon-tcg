import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-048.js";

describe("EX2-048 ADR-04 Bubbles", () => {
  it("places an ADR-02 Searcher from hand under Mother D-Reaper on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother" }],
          hand: [
            { card: "EX2-048", as: "bubbles" },
            { card: "EX2-046", as: "searcher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bubbles").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mother").stack.some((card) => card.instanceId === s.inst("searcher").instanceId));
    expect(s.perm("mother").stack.some((card) => card.instanceId === s.inst("searcher").instanceId)).toBe(true);
  });

  it("places an ADR-02 Searcher already in play under Mother D-Reaper", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother" },
            { card: "EX2-046", as: "searcher" },
          ],
          hand: [{ card: "EX2-048", as: "bubbles" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bubbles").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mother").stack.some((card) => card.instanceId === s.inst("searcher").instanceId));
    expect(s.perm("mother").stack.map((card) => card.instanceId)).toContain(s.inst("searcher").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("searcher").instanceId),
    ).toBe(false);
  });

  it("chooses exactly one Searcher across the hand and battle-area source pools", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother" },
            { card: "EX2-046", as: "fieldSearcher" },
          ],
          hand: [
            { card: "EX2-048", as: "bubbles" },
            { card: "EX2-046", as: "handSearcher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("handSearcher").instanceId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bubbles").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mother").stack.some((card) => card.instanceId === s.inst("handSearcher").instanceId));
    expect(s.perm("mother").stack.map((card) => card.instanceId)).toContain(s.inst("handSearcher").instanceId);
    expect(s.perm("fieldSearcher").topCard.instanceId).toBe(s.inst("fieldSearcher").instanceId);
  });

  it("leaves the Searcher in hand when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother" }],
          hand: [
            { card: "EX2-048", as: "bubbles" },
            { card: "EX2-046", as: "searcher" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bubbles").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX2-048"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("searcher").instanceId);
    expect(s.perm("mother").stack).toHaveLength(0);
  });

  it("places an in-play ADR-02 Searcher under Mother D-Reaper from Security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-001"] },
        1: {
          battleArea: [
            { card: "EX2-007", as: "mother" },
            { card: "EX2-046", as: "searcher" },
          ],
          security: [{ card: "EX2-048", as: "securityBubbles" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mother").stack.some((card) => card.instanceId === s.inst("searcher").instanceId));
    expect(s.perm("mother").stack).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("searcher").instanceId }),
    );
  });
});
