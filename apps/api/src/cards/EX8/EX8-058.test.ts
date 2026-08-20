import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-058.js";

describe("EX8-058", () => {
  it("gains 1 memory on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1 }));
  it("inherits a once-per-turn attack deletion against an opposing level 3 Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { count: 1, filter: { levels: [3] } } }] }));
});
