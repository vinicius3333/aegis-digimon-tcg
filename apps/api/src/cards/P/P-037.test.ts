import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import "../BT10/BT10-039.js";
import "../BT10/BT10-041.js";
import { memoryBoostColorRulings } from "./qaRulings1.testSupport.js";
import "./P-037.js";

memoryBoostTests({
  cardId: "P-037",
  name: "Yellow Memory Boost!",
  colorSource: "BT1-045",
  matchingDigimon: "BT1-045",
  offColorDigimon: "BT1-009",
});

describe("P-037 Yellow Memory Boost! — KB Q&A rulings (used by BT10-041 Sakuyamon: Maid Mode)", () => {
  it("stays in the battle area and never reaches the security stack after its own [Main] places it (Q1961)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-039", as: "taomon" }],
          hand: [
            { card: "BT10-041", as: "maid" },
            { card: "P-037", as: "boost" },
          ],
          deck: ["BT1-045", "BT1-046", "BT1-047", "BT1-048"],
          security: [{ card: "BT1-009", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoOrderCards: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const boostId = s.inst("boost").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("taomon").permanentId,
        instanceId: s.inst("maid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === boostId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === boostId)).toBe(false);
  });
});

memoryBoostColorRulings({
  cardId: "P-037",
  name: "Yellow Memory Boost!",
  sameColorOption: "BT1-107",
  colorRequirementQno: "Q4153",
  delayQno: "Q4154",
});
