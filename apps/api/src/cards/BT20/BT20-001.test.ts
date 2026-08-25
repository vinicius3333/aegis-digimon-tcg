import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import "./index.js";
import { compiled } from "./BT20-001.js";

describe("BT20-001 DemiVeemon", () => {
  it("only grants +2000 DP to this inherited Digimon with 4 or more digivolution cards", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    const action = effect?.actions[0];

    expect(effect?.trigger).toBe("YourTurn");
    expect(action).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
      condition: {
        kind: "selfDigivolutionCountAtLeast",
        value: 4,
      },
    });
    expect(irNode(action)?.target).toMatchObject({ count: 1, isSelf: true });
  });

  it("observably grants +2000 DP only on its controller's turn at the 4-card boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT20-011",
            dp: 3000,
            as: "atBoundary",
            under: ["BT20-001", "BT20-002", "BT20-003", "BT20-004"],
          },
          {
            card: "BT20-011",
            dp: 3000,
            as: "belowBoundary",
            under: ["BT20-001", "BT20-002", "BT20-003"],
          },
        ],
      },
    });

    await s.ready();
    expect(s.perm("atBoundary").currentDP).toBe(5000);
    expect(s.perm("belowBoundary").currentDP).toBe(3000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("atBoundary").currentDP).toBe(3000);
  });
});
