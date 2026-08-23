import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-055.js";
import "../index.js";

describe("BT26-055 Giromon", () => {
  it("shares the Once Per Turn body across play, digivolution, and Counter and inherits security trash", () => {
    expect(digivolutionRequirementsFor("BT26-055")).toContainEqual({
      level: 4,
      traits: ["DM"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.slice(1, 4).map((effect) => effect.sharedUseKey)).toEqual([
      "bt26-055-place-delete",
      "bt26-055-place-delete",
      "bt26-055-place-delete",
    ]);
    expect(compiled.effects?.[0]?.keywords).toContainEqual(expect.objectContaining({ keyword: "Fragment", amount: 2 }));
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        { kind: "SubTrigger", event: "whenLeavesPlay", actions: [{ kind: "SecurityManipulation", op: "trashTop" }] },
      ],
    });
  });

  it("publicly trashes the opponent's top security when the inherited source leaves play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "BT26-055", as: "giromon" }] }] },
      1: { security: [{ card: "BT1-001", as: "security" }] },
    });
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
