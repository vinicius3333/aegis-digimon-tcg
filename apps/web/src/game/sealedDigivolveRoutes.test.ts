import { expect, it } from "vitest";
import type { Permanent } from "@aegis/shared/schema/Permanent";
import { getDigivolveCostOptions } from "@/game/digivolveModel";

function buildBase(cardId: string): Permanent {
  return {
    permanentId: "base",
    topCard: { cardId, instanceId: "top" },
    stack: [],
    controllerSeat: 0,
    inBreeding: false,
  } as unknown as Permanent;
}
it("offers a server-projected ordinary cross-color route with its authoritative memory price", () => {
  expect(
    getDigivolveCostOptions("BT1-016", buildBase("BT1-029"), undefined, undefined, [
      { permanentId: "base", alternateRequirementIndex: -1, projectedCost: 2 },
    ]),
  ).toEqual([expect.objectContaining({ type: "normal", cost: 2 })]);
  expect(getDigivolveCostOptions("BT1-016", buildBase("BT1-029"))).toEqual([]);
});
it("preserves a choice between projected ordinary and indexed alternate cross-color routes", () => {
  const options = getDigivolveCostOptions("BT12-083", buildBase("BT10-019"), undefined, undefined, [
    { permanentId: "base", alternateRequirementIndex: -1, projectedCost: 3 },
    { permanentId: "base", alternateRequirementIndex: 0, projectedCost: 4 },
  ]);
  expect(options).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "normal", cost: 3 }),
      expect.objectContaining({ type: "alternate", cost: 4, alternateRequirementIndex: 0 }),
    ]),
  );
});
