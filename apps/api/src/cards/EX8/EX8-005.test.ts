import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-005.js";

describe("EX8-005", () => {
  it("inherits gaining 1 memory when this digivolution card is discarded", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "onDigivolutionCardDiscarded", actions: [{ kind: "GainMemory", amount: 1 }] }));
});
