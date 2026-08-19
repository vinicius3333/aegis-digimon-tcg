import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-080.js";

describe("BT23-080 Yu Nogi", () => {
  it("places the deleted CS Digimon on top of security and returns this Tamer to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-080", as: "yu" },
            { card: "BT23-006", as: "subject" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const subjectId = s.perm("subject").permanentId;
    await advance(s.engine).verb.deletePermanent([subjectId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === subjectId)).toBe(false);
    expect(s.state.players[0]!.security[0]?.cardId).toBe("BT23-006");
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT23-080")).toBe(true);
  });

  it("keeps the replacement limited to CS Digimon", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(replacement.event).toBe("wouldBeDeleted");
    expect(replacement.sourceFilter.nameOrTrait).toEqual([{ tokens: ["CS"], match: "trait" }]);
    expect(replacement.actions[0].source.sourceRef).toBe("triggerSubject");
    expect(replacement.actions[0].cost.to).toBe("deckBottom");
  });
});
