import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-064.js";
import "../index.js";

describe("BT16-064", () => {
  it("models Collision and deletes an unsuspended opponent when SoC is underneath", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Collision" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Delete", condition: { kind: "selfDigivolutionStackMatchesFilter", filter: { kind: ["Tamer"] } } },
      ],
    });
  });

  it("optionally unsuspends itself once per turn when another of yours is deleted", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "Unsuspend", optional: true }] }],
    });
  });

  it("keeps Collision active on a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-064", as: "dorugora" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("dorugora"), "Collision")).toBe(true);
  });
});
