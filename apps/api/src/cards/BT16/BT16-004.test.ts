import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-004.js";

describe("BT16-004", () => {
  it("once per turn gains memory when it deletes in battle and has two colors", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "selfColorCount", value: 2 } }] }] }));
});
