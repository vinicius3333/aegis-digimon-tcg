import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-072.js";

describe("BT14-072", () => it("returns a purple Dark Animal from trash to hand, then trashes a hand card on play and attack", () => {
  for (const trigger of ["OnPlay", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Return", to: "hand", target: { filter: { zone: "trash", colors: ["Purple"], nameOrTrait: [{ tokens: ["Dark Animal"], match: "trait" }] } } }, { kind: "Trash", target: { filter: { zone: "hand" } } }] });
}));
