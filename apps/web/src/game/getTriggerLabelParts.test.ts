import { buildTriggerKey } from "@aegis/shared";
import { expect, it } from "vitest";
import { getTriggerLabelParts } from "@/game/getTriggerLabelParts";

const getDisplayName = (cardId: string) => `name:${cardId}`;

it("returns the copy number apart from the card name for different permanents", () => {
  expect(
    getTriggerLabelParts({
      triggerKeys: [buildTriggerKey("perm-a", "AD1-001/on-play"), buildTriggerKey("perm-b", "AD1-001/on-play")],
      cardIds: ["AD1-001", "AD1-001"],
      getDisplayName,
    }),
  ).toEqual([
    { name: "name:AD1-001", copy: { index: 1, total: 2 } },
    { name: "name:AD1-001", copy: { index: 2, total: 2 } },
  ]);
});

it("gives two effects of one permanent no copy number", () => {
  expect(
    getTriggerLabelParts({
      triggerKeys: [buildTriggerKey("perm-a", "AD1-001/on-play"), buildTriggerKey("perm-a", "AD1-001/digivolve")],
      cardIds: ["AD1-001", "AD1-001"],
      getDisplayName,
    }),
  ).toEqual([{ name: "name:AD1-001" }, { name: "name:AD1-001" }]);
});
