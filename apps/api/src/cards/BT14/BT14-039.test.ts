import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-039.js";

describe("BT14-039", () => {
  it("has Armor Purge and gains two memory by placing a Numemon from trash underneath", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "GainMemory", amount: 2, cost: { kind: "place", destination: "digivolutionStack" } }] }));
  it("inherits Security Attack +1 for Monzaemon or Numemon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } }, while: { kind: "selfHasNameContaining" } }] }));
});
