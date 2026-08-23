import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-006.js";

describe("BT14-006", () => {
  it("digivolves from the trashed hand card with normal requirements and cost", () =>
    expect(compiled.effects[0]).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          actions: [{ kind: "Digivolve", from: ["trash"], payCost: true, optional: true }],
        },
      ],
    }));
});
