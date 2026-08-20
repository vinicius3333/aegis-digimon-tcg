import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-029.js";

describe("EX6-029 Mastemon", () => {
  it("has Blast DNA Digivolve and plays a level 5 or lower Angel-family Digimon from hand or trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe("BlastDNADigivolve");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true, target: { filter: { levelComparison: { op: "lte", value: 5 } } } });
  });
  it("during DNA digivolving places a security card under a Digimon and trashes security until four remain", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions.slice(1)).toMatchObject([{ kind: "PlaceUnder", condition: { kind: "isDnaDigivolving" }, underFilter: { zone: "security", position: "bottom" } }, { kind: "SecurityManipulation", op: "trashTop", leaveCount: 4, condition: { kind: "isDnaDigivolving" } }]));
});
