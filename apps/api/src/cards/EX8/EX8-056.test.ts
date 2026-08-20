import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-056.js";

describe("EX8-056", () => {
  it("draws 1 then trashes 1 card on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "Trash", target: { count: 1 } }]));
  it("inherits a once-per-turn attack deletion against an opposing level 3 Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { count: 1, filter: { levels: [3] } } }] }));
});
