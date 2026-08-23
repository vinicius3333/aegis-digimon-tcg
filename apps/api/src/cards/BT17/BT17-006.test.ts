import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-006.js";

describe("BT17-006", () => {
  it("reacts to a Tamer placed under this host and digivolves from trash", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [{ kind: "Digivolve", from: ["trash"], optional: true }],
        },
      ],
    });
  });
});
