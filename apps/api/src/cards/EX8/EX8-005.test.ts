import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-005.js";

describe("EX8-005", () => {
  it("inherits gaining 1 memory when discarded from a Mineral or Rock host", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "onDigivolutionCardDiscarded", sourceFilter: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] }, actions: [{ kind: "GainMemory", amount: 1 }] }));
});
