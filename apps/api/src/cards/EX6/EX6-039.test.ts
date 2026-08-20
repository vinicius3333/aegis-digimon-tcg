import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-039.js";

describe("EX6-039 Diaboromon", () => {
  it("reduces its play cost by 3 by deleting an Unidentified Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({ kind: "Replacement", actions: [{ kind: "Replacement", mode: "reduceCost", amount: 3, cost: { kind: "deleteOwn", target: { filter: { nameOrTrait: [{ match: "trait", tokens: ["Unidentified"] }] } } } }] }));
  it("deletes a low-cost opposing Digimon on play/digivolving and inherits Diaboromon token play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { playCostLte: 3 } } });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "PlayToken", tokens: ["Diaboromon"], optional: true }] });
  });
});
