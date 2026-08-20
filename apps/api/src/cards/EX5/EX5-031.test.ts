import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-031.js";

describe("EX5-031 Chirinmon", () => {
  it("can trash the top security card to unsuspend when digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Unsuspend", optional: true, cost: { kind: "trash", target: { filter: { controller: "mine" } } } });
  });
  it("inherits placing a yellow hand card into security when combined security is six or fewer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["hand"], condition: { kind: "totalSecurityCount", op: "lte", value: 6 } });
  });
});
