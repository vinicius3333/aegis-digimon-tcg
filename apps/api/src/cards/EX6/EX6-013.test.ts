import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-013.js";

describe("EX6-013 Bukamon", () => {
  it("draws on play and gains memory when played from digivolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "GainMemory", amount: 1, condition: { kind: "playedFromZone", zone: "digivolutionCards" } }]);
  });
  it("grants Aquatic as a rule and inherits Jamming", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
  });
});
