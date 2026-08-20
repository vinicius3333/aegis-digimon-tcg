import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-024.js";

describe("EX7-024 Shoemon", () => {
  it("reduces Puppet digivolution costs by 1 on your turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldDigivolve", into: { nameOrTrait: [{ tokens: ["Puppet"] }] }, actions: [{ mode: "reduceCost", amount: 1 }] }));
  it("inherits permanent -3000 DP to all opposing Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "permanent", target: { count: "all" } }));
});
