import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-026.js";

describe("BT12-026 ShogunGekomon", () => {
  it("gains memory once when an opponent Digimon's digivolution card is trashed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-026", as: "shogun" }] },
      1: {
        battleArea: [
          {
            card: "BT1-009",
            as: "target",
            under: [{ card: "BT12-019", as: "source" }],
          },
        ],
      },
    });
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("target").permanentId, [s.inst("source").instanceId], 0);
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("source").instanceId);
  });
});
