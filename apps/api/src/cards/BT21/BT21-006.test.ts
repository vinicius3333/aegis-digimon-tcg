import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-006.js";
import "../index.js";

describe("BT21-006 Tsumemon", () => {
  it("grants +3000 DP only with at least four Vemmon digivolution cards", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "ModifyDP",
            amount: 3000,
            duration: "permanent",
            condition: {
              kind: "selfDigivolutionStackCountAtLeast",
              count: 4,
              filter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }] },
            },
          }),
        ],
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("applies the inherited DP bonus at exactly four named Vemmon sources", async () => {
    const below = setupEngine({
      0: {
        battleArea: [{ card: "BT21-062", as: "below", under: ["BT21-006", "BT21-056", "BT21-056", "BT21-056"] }],
      },
    });
    const atBoundary = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT21-062",
            as: "atBoundary",
            under: ["BT21-006", "BT21-056", "BT21-056", "BT21-056", "BT21-056"],
          },
        ],
      },
    });

    await below.ready();
    await atBoundary.ready();
    expect(below.perm("below").currentDP).toBe(14000);
    expect(atBoundary.perm("atBoundary").currentDP).toBe(17000);
    expect(atBoundary.perm("atBoundary").stack.map((card) => card.cardId)).toEqual([
      "BT21-006",
      "BT21-056",
      "BT21-056",
      "BT21-056",
      "BT21-056",
    ]);
  });

  it("counts card names rather than near matches that merely contain Vemmon in their text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT21-062",
            as: "host",
            under: ["BT21-006", "BT21-056", "BT21-056", "BT21-056", "BT21-058"],
          },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(14000);
  });

  it("keeps the +3000 DP bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT21-062",
            as: "host",
            under: ["BT21-006", "BT21-056", "BT21-056", "BT21-056", "BT21-056"],
          },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(17000);
  });
});
