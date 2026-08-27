import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-097.js";

describe("BT7-097 Tidal Wave", () => {
  it("plays two Digimon from one chosen digivolution stack unsuspended and without cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-018",
              as: "host",
              under: [
                { card: "BT7-019", as: "first" },
                { card: "BT7-020", as: "second" },
              ],
            },
          ],
          hand: [{ card: "BT7-097", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    const played = s.state.players[0]!.battleArea.filter(
      (permanent) =>
        permanent.topCard.instanceId === s.inst("first").instanceId ||
        permanent.topCard.instanceId === s.inst("second").instanceId,
    );
    expect(played).toHaveLength(2);
    expect(played.every((permanent) => !permanent.isSuspended)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("allows choosing zero cards because the printed count is up to two", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-018", as: "host", under: [{ card: "BT7-019", as: "source" }] }],
        hand: [{ card: "BT7-097", as: "option" }],
      },
    });
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.options).toMatchObject({ min: 0, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
