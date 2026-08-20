import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-076.js";

describe("BT14-076", () => {
  it("deletes the lowest-level opponent Digimon by trashing a hand card on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Delete", cost: { kind: "trash", target: { filter: { zone: "hand" } } }, target: { filter: { superlative: "lowestLevel" } } }));
  it("plays an Agumon from trash and grants a Digimon Rush if Tai is present on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({ actions: [{ kind: "PlayWithoutCost", from: ["trash"] }, { kind: "GainKeyword", keyword: { keyword: "Rush" }, condition: { kind: "youHave" } }] }));
});
