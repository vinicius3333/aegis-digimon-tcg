import { CardInstance, Permanent } from "@aegis/shared";
import { expect, it } from "vitest";
import { findDnaMaterialCombination, handCardEvolutionRoute } from "./digivolveModel";
import { dnaFieldChoice } from "./screen/model/dnaMaterialSelection";

it("GitHub #5273: identical Ouryumon cards remain two selectable physical DNA materials", () => {
  const copies = ["first-ouryumon", "second-ouryumon"].map((id) =>
    Object.assign(new Permanent(), {
      permanentId: id,
      topCard: Object.assign(new CardInstance(), { instanceId: `${id}-top`, cardId: "BT20-018" }),
    }),
  );
  const ids = copies.map((p) => p.permanentId);
  const routes = [{ materialPermanentIds: ids, projectedCost: 0 }];
  expect(findDnaMaterialCombination("BT20-060", copies)).toEqual(ids);
  expect(handCardEvolutionRoute("BT20-060", copies, true, routes, ids[1])).toEqual({
    kind: "both",
    materialPermanentIds: ids,
  });
  const first = dnaFieldChoice(routes, copies, [ids[0]!]);
  expect([...first.candidates]).toEqual(ids);
  expect(first.selected).toBeUndefined();
  expect(dnaFieldChoice(routes, copies, ids).selected).toEqual(routes[0]);
  expect(dnaFieldChoice(routes, copies.slice(0, 1), ids).selected).toBeUndefined();
});
