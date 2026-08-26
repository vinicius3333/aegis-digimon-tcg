import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-065.js";

describe("EX6-065 Mythical Arms of Salvation!", () => {
  it("waives color requirements with Legend-Arms and can place one from trash under a Digimon then play itself", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "PlaceUnder", target: { from: ["trash"] }, optional: true },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
  });
  it("arms Delay when your Digimon would leave and uses the armed delayed play from its stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenDigimonWouldLeave", leaveCause: "otherThanYourEffect", actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }] });
    expect(compiled.effects?.filter((entry) => entry.trigger === "Main").at(-1)?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], requiresDelayArmed: true, target: { filter: { hostFilter: { sourceRef: "triggerSubject" } } } });
  });
});
