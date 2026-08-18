import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-086.js";
import "./BT3-092.js";

describe("BT3-086 Arukenimon", () => {
  it("may pay 3 memory to play MaloMyotismon from hand, then deletes itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-086", as: "arukenimon" }],
          hand: [{ card: "BT3-092", as: "maloMyotismon" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const sourceId = s.perm("arukenimon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourceId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const activation = s.decisions.at(-1)!.req;
    expect(activation.sourceCardId).toBe("BT3-086");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: activation.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT3-092") &&
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === sourceId) &&
        s.state.memory === 3,
      5000,
    );

    expect(s.state.memory).toBe(3);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
  });
});
