import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-068.js";

describe("BT12-068 MetalGreymon", () => {
  it("has Raid and gives a Greymon host inherited Piercing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-068", as: "metal" },
          { card: "BT1-015", as: "host", under: ["BT12-068"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("metal"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Piercing")).toBe(true);
  });

  it("plays a qualifying Tamer when any attack target is switched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-068", as: "metal" },
            { card: "BT1-009", as: "attacker" },
          ],
          hand: [{ card: "BT1-085", as: "tai" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-085"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-085")).toBe(true);
  });
});
