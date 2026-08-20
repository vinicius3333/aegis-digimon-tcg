import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-044.js";

describe("EX9-044", () => {
  it("reduces play cost by suspending an own WG Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ actions: [{ actions: [{ mode: "reduceCost", amount: 4, cost: { kind: "suspend" } }] }] }));
  it("suspends and restricts an opposing Digimon or Tamer on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend", target: { filter: { kind: ["Digimon", "Tamer"] } } }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }] });
  });
  it("has once-per-turn WG DNA digivolution responses", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "DnaDigivolve" }] }, { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [{ kind: "DnaDigivolve" }] }] }));
});
