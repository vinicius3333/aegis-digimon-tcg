import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-031.js";

describe("EX5-031 Chirinmon", () => {
  it("can trash the top security card to unsuspend when digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      optional: false,
      cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security", position: "top" } } },
    });
  });
  it("inherits placing a yellow hand card into security when combined security is six or fewer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          from: ["hand"],
          toTop: true,
          condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
          optional: true,
          source: { filter: { controllerDefault: "mine", colors: ["Yellow"] }, count: 1 },
        },
      ],
    });
  });
});
