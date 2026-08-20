import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-028.js";

describe("EX6-028 MagnaAngemon", () => {
  it("has Blast Digivolve and Recovery +1 on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe("BlastDigivolve");
    expect(compiled.effects?.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving").every((entry) => entry.keywords?.[0]?.keyword === "Recovery")).toBe(true);
  });
  it("returns an opposing Digimon based on your security additions once per turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAddSecurity", fireCondition: { kind: "triggerSecurityIsYours" }, actions: [{ kind: "Return", to: "hand", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 0, scaling: { unit: "security", per: 1 } } } } }] }));
});
