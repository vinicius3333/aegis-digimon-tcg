import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-064.js";

describe("BT16-064", () => {
  it("models Collision and deletes an unsuspended opponent when SoC is underneath", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Collision" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete", condition: { kind: "selfDigivolutionStackHasTrait" } }] });
  });

  it("optionally unsuspends itself once per turn when another of yours is deleted", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "Unsuspend", optional: true }] }] });
  });
});
