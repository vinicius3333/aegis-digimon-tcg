import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-023.js";

describe("EX5-023 WereGarurumon (X Antibody)", () => {
  it("trashes two hand cards to unsuspend and conditionally returns a Garurumon/X Antibody from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Unsuspend", optional: true, abortOnDecline: true, cost: { kind: "trash", target: { filter: { zone: "hand" }, count: 2 } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[1]).toMatchObject({ kind: "Return", to: "hand", optional: true, condition: { kind: "selfDigivolutionStackHasTrait" } });
  });
  it("can trash one hand card to unsuspend when attacking under the name condition", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({ kind: "Unsuspend", optional: true, cost: { kind: "trash", target: { filter: { zone: "hand" }, count: 1 } } });
  });
});
