import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-004.js";

describe("EX7-004 Wormmon", () => {
  it("inherits once-per-turn memory when an effect deletes in battle", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "GainMemory", amount: 1 }] }] }));
});
