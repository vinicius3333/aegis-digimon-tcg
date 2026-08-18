import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-087.js";
import "./BT3-092.js";

describe("BT3-087 Mummymon", () => {
  it("may pay 3 memory to play MaloMyotismon from trash, then deletes itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-087", as: "mummymon" }],
          trash: [{ card: "BT3-092", as: "maloMyotismon" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const sourceId = s.perm("mummymon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourceId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT3-092") &&
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === sourceId) &&
        s.state.memory === 3,
      5000,
    );

    expect(s.state.memory).toBe(3);
  });

  it("declining the single activation keeps Mummymon in play and does not pay memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-087", as: "mummymon" }],
          trash: [{ card: "BT3-092", as: "maloMyotismon" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const sourceId = s.perm("mummymon").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: sourceId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const activation = s.decisions.at(-1)!.req;
    expect(activation.sourceCardId).toBe("BT3-087");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: activation.decisionId,
      response: { kind: "optional", accept: false },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sourceId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT3-092")).toBe(true);
    expect(s.state.memory).toBe(5);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
  });
});
