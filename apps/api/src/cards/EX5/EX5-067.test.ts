import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-067.js";

describe("EX5-067 Maki", () => {
  it("suspends one opposing Digimon or Tamer and optionally plays a Night Claw/Light Fang Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { filter: { controller: "mine", kind: ["Tamer"] } } }]);
  });
  it("activates its Main effect from security", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]?.kind).toBe("ActivateMain"));
});
