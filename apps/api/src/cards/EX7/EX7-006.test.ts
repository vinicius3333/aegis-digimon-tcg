import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-006.js";

describe("EX7-006 Dracomon", () => {
  it("inherits once-per-turn free Dark Dragon/Evil Dragon evolution from trash when your hand has four or fewer cards", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Digivolve", from: ["trash"], payCost: false, optional: true, condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 } }] }));
});
