import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

const answers = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true };

describe.each([true, false])("optional processing costs (payload target present: %s)", (hasTarget) => {
  it("Ravemon BT26-082 can self-delete after digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-076", as: "base" }],
          hand: [{ card: "BT26-082", as: "raven" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: hasTarget ? ["ST1-03"] : [] },
      },
      answers,
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("raven").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).not.toContain("BT26-082");
  });

  it.each(["BT26-023", "BT26-072"])("%s can pay its hand-card processing cost on play", async (cardId) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-001", as: "cost" },
          ],
        },
        1: { battleArea: hasTarget ? ["ST1-03"] : [] },
      },
      answers,
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    const paidZone = cardId === "BT26-023" ? s.state.players[0]!.battleArea[0]!.stack : s.state.players[0]!.trash;
    expect(paidZone.map((c) => c.instanceId)).toContain(s.inst("cost").instanceId);
  });
});
