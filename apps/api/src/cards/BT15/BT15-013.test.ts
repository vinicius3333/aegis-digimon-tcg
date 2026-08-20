import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-013.js";

describe("BT15-013", () => {
  it("returns one red Avian/Bird/Beast/Animal/Sovereign other than Sea Animal from trash", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Return", to: "hand", target: { count: 1, filter: { zone: "trash", colors: ["Red"], excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }] } } }] }));
  it("gains 1 memory once per turn when security is removed", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved" }] }));
});
