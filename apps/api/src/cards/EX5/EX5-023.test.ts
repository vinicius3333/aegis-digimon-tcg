import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-023.js";

describe("EX5-023 WereGarurumon (X Antibody)", () => {
  it("trashes two hand cards to unsuspend and conditionally returns a Garurumon/X Antibody from trash", () => {
    const digivolvingAction = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0];
    expect(digivolvingAction).toMatchObject({
      kind: "Unsuspend",
      cost: { kind: "trash", target: { filter: { zone: "hand" }, count: 2 } },
    });
    expect(digivolvingAction).not.toHaveProperty("optional");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[1]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
  });
  it("can trash one hand card to unsuspend when attacking under the name condition", () => {
    const attackingAction = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0];
    expect(attackingAction).toMatchObject({
      kind: "Unsuspend",
      condition: { kind: "selfHasNameContaining", names: ["Garurumon", "Omnimon"] },
      cost: { kind: "trash", target: { filter: { zone: "hand" }, count: 1 } },
    });
    expect(attackingAction).not.toHaveProperty("optional");
  });
});
