import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-041.js";

describe("EX6-041 Diaboromon", () => {
  it("offers free Diaboromon evolution from hand by deleting a Diaboromon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], payCost: false, ignoreReqs: false, optional: true, cost: { kind: "deleteOwn", target: { filter: { nameOrTrait: [{ match: "name", tokens: ["Diaboromon"] }] } } } }));
  it("inherits once-per-turn de-digivolution when another Diaboromon is played", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 }] }] }));
});
