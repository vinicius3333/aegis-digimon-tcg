import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-019.js";

describe("EX9-019", () => {
  it("prevents an opposing Digimon or Tamer from suspending on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
  });
  it("during your turn digivolves into Garurumon after Greymon/Matt or another Greymon digivolves", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Digivolve", payCost: false }] }, { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [{ kind: "Digivolve", payCost: false }] }]));
});
