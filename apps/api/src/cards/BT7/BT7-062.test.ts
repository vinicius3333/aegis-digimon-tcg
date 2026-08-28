import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT7-062.js";

describe("BT7-062 Dorugamon", () => {
  it("records self-targeted Blocker with both X-Antibody condition branches", () => {
    const card = runtimeCompiledCard("BT7-062");
    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "Aura",
              target: { filter: { isSelfRef: true } },
              effect: { kind: "keyword", keyword: { keyword: "Blocker" } },
              while: { kind: "anyOf", conditions: [{ kind: "youHave" }, { kind: "selfDigivolutionStackHasTrait" }] },
            },
          ],
        },
        {
          trigger: "AllTurns",
          isInherited: true,
          actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfHasTrait" } }],
        },
      ],
    });
  });

  it("gains Blocker on the opponent's turn with an X-Antibody source and gives an X-Antibody host +1000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT7-062", under: ["BT7-056"], as: "dorugamon" },
          { card: "BT7-065", under: ["BT7-062"], as: "inheritedHost" },
        ],
      },
    });
    const baseDP = s.perm("inheritedHost").currentDP;
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("dorugamon"), "Blocker")).toBe(true);
    expect(s.perm("inheritedHost").currentDP).toBe(baseDP + 1000);
  });
});
