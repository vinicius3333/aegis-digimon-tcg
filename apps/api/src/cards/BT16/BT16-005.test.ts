import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-005.js";
import "../index.js";

describe("BT16-005", () => {
  it("once per turn gains memory when another Blocker Digimon is deleted", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { excludeSelf: true, keywords: ["Blocker"] },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    }));

  it("gains memory once when another Blocker is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-011", as: "host", under: ["BT16-005"] }] },
      1: {
        battleArea: [
          { card: "BT5-062", as: "firstBlocker" },
          { card: "BT5-062", as: "secondBlocker" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("firstBlocker").permanentId]);
    await advance(s.engine).verb.deletePermanent([s.perm("secondBlocker").permanentId]);

    expect(s.state.memory).toBe(1);
  });
});
