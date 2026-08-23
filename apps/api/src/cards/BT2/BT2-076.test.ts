import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-076.js";

describe("BT2-076 Pumpkinmon", () => {
  it("draws 2, then lets its controller choose 1 card in hand to trash when its host is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-079", as: "host", under: ["BT2-076"] }],
        hand: [{ card: "BT1-012", as: "existing" }],
        deck: [
          { card: "BT1-010", as: "firstDraw" },
          { card: "BT1-011", as: "secondDraw" },
        ],
      },
    });

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.inst("existing").instanceId,
        s.inst("firstDraw").instanceId,
        s.inst("secondDraw").instanceId,
      ]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("secondDraw").instanceId] },
      }),
    ).toEqual({ ok: true });
    await deletion;

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("existing").instanceId,
      s.inst("firstDraw").instanceId,
    ]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("secondDraw").instanceId)).toBe(true);
  });

  it("does not activate while Pumpkinmon is the top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-076", as: "pumpkinmon" }],
        deck: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("pumpkinmon").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("activates when its host is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 20000 }] },
        1: {
          battleArea: [{ card: "BT2-079", as: "host", under: ["BT2-076"], suspended: true }],
          deck: [
            { card: "BT1-029", as: "first" },
            { card: "BT1-030", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.hand.length === 1);

    expect(s.state.players[1]!.trash).toHaveLength(3);
  });
});
