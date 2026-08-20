import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-027.js";

describe("BT14-027", () => it("returns all opposing level 3 Digimon to hand on play and digivolution", () => {
  for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { count: "all", filter: { levels: [3] } } });
}));
