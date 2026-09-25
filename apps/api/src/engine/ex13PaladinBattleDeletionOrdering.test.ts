import { describe, expect, it } from "vitest";
import { assertNoLoudGap, settle, setupEngine } from "./testkit/harness.js";
import "../cards/index.js";

describe("EX13-076 forced battle trigger ordering (Q7463)", () => {
  it("orders the turn player's When Battle Won activation before the opponent's On Deletion activation", async () => {
    const paladinId = "EX13-076";
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-075", as: "base", under: ["BT1-011"] }],
          hand: [{ card: paladinId, as: "paladin" }],
          deck: ["BT1-010", "BT1-011", "BT1-014"],
          security: ["BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-035", as: "leomon" },
            { card: "BT1-014", as: "returnTarget" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-014"],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paladin").instanceId,
      }),
    ).toEqual({ ok: true });
    const returnTargetId = s.inst("returnTarget").instanceId;

    await settle(() => s.state.players[1]!.deck.some(({ instanceId }) => instanceId === returnTargetId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toContain(returnTargetId);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-035");
    const winTriggerIndex = s.events.findIndex(
      (event) =>
        event.kind === "effectTriggered" && event.sourceCardId === paladinId && event.timing === "whenBattleWon",
    );
    const deletionIndex = s.events.findIndex(
      (event) =>
        event.kind === "effectResolved" && event.sourceCardId === "BT1-035" && event.timing === "OnDestroyedAnyone",
    );
    expect(winTriggerIndex).toBeGreaterThanOrEqual(0);
    expect(deletionIndex).toBeGreaterThan(winTriggerIndex);
    assertNoLoudGap(s);
  });
});
