import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-058.js";

describe("EX6-058 Belphemon: Sleep Mode", () => {
  it("has Blocker and deletes the opponent's lowest-DP Digimon, then trashes cards based on your Digimon count", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Delete", target: { filter: { superlative: "lowestDP" } } }, { kind: "Trash", scaling: { per: 1, unit: "cards" } }]);
  });
  it("places a Seven Great Demon Lords card under a Gate of Deadly Sins when leaving play", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", sourceFilter: { isSelfRef: true }, actions: [{ kind: "PlaceUnder", underFilter: { nameOrTrait: [{ match: "name", tokens: ["Gate of Deadly Sins"] }] } }] }));
});
