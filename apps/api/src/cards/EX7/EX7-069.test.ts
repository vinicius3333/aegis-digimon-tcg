import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-069.js";

describe("EX7-069", () => {
  it("suspends one level 6 or lower Digimon and unsuspends one of your Digimon if your Digimon was suspended", () => expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([{ kind: "Suspend", optional: true }, { kind: "Unsuspend", condition: { kind: "ifThisEffectActed" } }]));
  it("activates its Main effect from security", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({ kind: "ActivateMain" }));
});
