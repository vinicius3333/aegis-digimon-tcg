import { type Permanent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getDigivolveCostOptions } from "./digivolveModel";

function base(cardId: string, inBreeding: boolean): Permanent {
  return {
    permanentId: "base",
    controllerSeat: 0,
    topCard: { cardId, instanceId: "top" },
    stack: [],
    inBreeding,
  } as unknown as Permanent;
}

describe("#5362 Shellmon client evolution routes", () => {
  it.each([false, true])("offers TS and blue routes with inBreeding=%s", (inBreeding) => {
    for (const id of ["BT24-033", "BT24-009"]) {
      expect(getDigivolveCostOptions("BT24-025", base(id, inBreeding))).toEqual([
        expect.objectContaining({ type: "alternate", cost: 2, alternateRequirementIndex: 0 }),
      ]);
    }
    expect(getDigivolveCostOptions("BT24-025", base("BT1-028", inBreeding))).toEqual([
      expect.objectContaining({ type: "normal", cost: 2 }),
    ]);
    for (const id of ["BT1-045", "BT24-011"]) {
      expect(getDigivolveCostOptions("BT24-025", base(id, inBreeding))).toEqual([]);
    }
    expect(
      getDigivolveCostOptions("BT24-025", base("BT24-033", inBreeding), undefined, undefined, [
        { permanentId: "base", alternateRequirementIndex: 0, projectedCost: inBreeding ? 2 : 1 },
      ]),
    ).toEqual([expect.objectContaining({ type: "alternate", cost: inBreeding ? 2 : 1, alternateRequirementIndex: 0 })]);
  });
});
