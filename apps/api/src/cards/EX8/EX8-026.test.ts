import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-026.js";

describe("EX8-026", () => {
  it("has Blast Digivolve, de-digivolves and bottom-decks an opposing Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({ keyword: "BlastDigivolve" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "DeDigivolve", amount: 1 }, { kind: "Return", to: "deckBottom", target: { filter: { playCostLte: 7 } } }]);
  });
  it("prevents opposing Digimon from suspending while you have at least 1 memory and grants Aquatic", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "suspend", while: { kind: "memoryAtLeast", value: 1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", tokens: ["Aquatic"] });
  });
});
