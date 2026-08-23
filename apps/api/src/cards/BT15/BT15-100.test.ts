import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-100.js";

describe("BT15-100", () => {
  it("deletes an opposing level 4 and level 6 Digimon, paying for the first by trashing a hand card", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "Delete", target: { filter: { levels: [4] } }, cost: { kind: "trash" } },
        { kind: "Delete", target: { filter: { levels: [6] } } },
      ],
    });
  });
  it("from trash reacts to a Leviamon X Antibody digivolution and returns itself to the bottom", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isFromTrash: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [{ kind: "Delete", cost: { kind: "return" } }, { kind: "Delete" }],
        },
      ],
    }));
});
