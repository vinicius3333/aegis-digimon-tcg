import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-045.js";

describe("P-045 Kurisarimon", () => {
  it("grants Decoy (Black/White) to another same-name Digimon and protects the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-016", as: "protected", under: ["P-045"] },
            { card: "P-016", as: "decoy" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("decoy"), "Decoy")).toBe(true);
    await advance(s.engine).verb.deletePermanent([s.perm("protected").permanentId], "byEffect");

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("protected").permanentId),
    ).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard.cardId === "P-016" && permanent.permanentId !== s.perm("protected").permanentId,
      ),
    ).toBe(false);
  });

  it("does not spend the granted Decoy on a battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-016", as: "defeated", under: ["P-045"] },
            { card: "P-016", as: "decoy" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("defeated").permanentId], "byBattle");

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.permanentId).toBe(s.perm("decoy").permanentId);
  });
});
