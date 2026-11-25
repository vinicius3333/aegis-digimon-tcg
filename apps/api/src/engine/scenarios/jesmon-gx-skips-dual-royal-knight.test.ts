import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/jesmon-gx-skips-dual-royal-knight.fixture";

function instanceIds(cards: readonly { instanceId: string }[]): string[] {
  return cards.map(({ instanceId }) => instanceId);
}

describe("Jesmon GX can't borrow a DUAL Royal Knight's clause", () => {
  it("leaves the DUAL card in hand because it has no play cost", async () => {
    const s = setupScenario(fixture, { autoAcceptOptional: false, autoSelectCards: false });
    const loop = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("jesmon").permanentId,
          instanceId: s.inst("jesmonGx").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("jesmon").topCard.cardId === "BT10-112");
      await settle();

      const opponent = s.state.players[1]!;
      expect(instanceIds(s.state.players[0]!.hand)).toContain(s.inst("jesmonXAntibody").instanceId);
      expect(instanceIds(s.perm("jesmon").stack)).not.toContain(s.inst("jesmonXAntibody").instanceId);
      expect(opponent.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-060", "BT1-080"]);
      expect(opponent.security).toHaveLength(3);
      expect(opponent.trash).toHaveLength(0);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat as 0 | 1, { type: "surrender" });
      await loop;
    }
  });
});
