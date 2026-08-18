import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-073.js";

describe("BT12-073 Impmon (X Antibody)", () => {
  it("trashes an Option from hand to recover an eligible Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT12-073", as: "imp" },
            { card: "BT1-109", as: "option" },
          ],
          trash: [{ card: "BT10-010", as: "wizard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("imp").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT10-010"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT10-010");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-109");
  });
});
