import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT10/BT10-066.js";
import "../cards/BT10/BT10-092.js";
import "../cards/BT10/BT10-104.js";

describe("PlayFromZone DigiXros On Play context", () => {
  it("carries trash DigiXros material count into the played card's On Play window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-092", as: "nene" }],
          hand: [{ card: "BT10-104", as: "immortalRuler" }],
          trash: [
            { card: "BT10-066", as: "darkKnightmon" },
            { card: "BT7-058", as: "skullKnightmon" },
            { card: "BT7-059", as: "deadlyAxemon" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: "BT10-020", as: "deleteTarget", under: [{ card: "BT1-009" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    const targetId = s.perm("deleteTarget").permanentId;
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("immortalRuler").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-066"),
      5000,
    );

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT10-066");
    expect(played?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT7-058", "BT7-059"]));
    // Mutation rationale: removing the digiXrosMaterialCount spread from
    // fireEnteredByEffectTiming's OnPlay call leaves these two materials attached but makes
    // BT10-066's `digiXrosCount >= 2` condition false, so this target remains in play.
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });
});
