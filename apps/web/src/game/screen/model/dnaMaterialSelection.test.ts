import { expect, it } from "vitest";
import { CardInstance, Permanent } from "@aegis/shared";
import { dnaFieldChoice, dnaMaterialPicks, toggleDnaMaterial } from "./dnaMaterialSelection";
import type { PendingActionConfirmation } from "../types";

const routes = [
  { materialPermanentIds: ["yellow", "purple-one"], projectedCost: 0 },
  { materialPermanentIds: ["yellow", "purple-two"], projectedCost: 1 },
];
const permanents = ["yellow", "purple-one", "purple-two", "unrelated"].map((id) =>
  Object.assign(new Permanent(), {
    permanentId: id,
    topCard: Object.assign(new CardInstance(), { instanceId: id, cardId: "ST10-12" }),
  }),
);

it("only offers physical partners from a server route after the first field pick", () => {
  const first = dnaFieldChoice(routes, permanents, ["purple-two"]);
  expect([...first.candidates]).toEqual(["purple-two", "yellow"]);
  expect(first.selected).toBeUndefined();
  const both = dnaFieldChoice(routes, permanents, ["purple-two", "yellow"]);
  expect(both.selected).toEqual(routes[1]);
  expect(both.orderedPicks).toEqual(["yellow", "purple-two"]);
  expect(both.candidates.has("purple-one")).toBe(false);
});

it("deselects a material so another compatible stack can be picked without sending an intent", () => {
  const picks = toggleDnaMaterial(["yellow", "purple-two"], "purple-two");
  expect([...dnaFieldChoice(routes, permanents, picks).candidates]).toEqual(["yellow", "purple-one", "purple-two"]);
});

it("does not substitute a different physical pair after the selected route or a material leaves", () => {
  const picks = ["yellow", "purple-two"];
  expect(dnaFieldChoice([routes[0]!], permanents, picks).selected).toBeUndefined();
  expect(
    dnaFieldChoice(
      routes,
      permanents.filter((p) => p.permanentId !== "purple-two"),
      picks,
    ).selected,
  ).toBeUndefined();
});

it("does not carry materials into a new declaration of the same hand card", () => {
  const action: PendingActionConfirmation = {
    kind: "dna",
    cardId: "ST10-06",
    instanceId: "mastemon",
    materialPermanentIds: routes[0]!.materialPermanentIds,
    initialPermanentId: "yellow",
  };
  const stored = { action, permanentIds: ["yellow", "purple-two"] };
  expect(dnaMaterialPicks(action, stored)).toEqual(["yellow", "purple-two"]);
  expect(dnaMaterialPicks({ ...action }, stored)).toEqual(["yellow"]);
  expect(dnaMaterialPicks(null, stored)).toEqual([]);
});
