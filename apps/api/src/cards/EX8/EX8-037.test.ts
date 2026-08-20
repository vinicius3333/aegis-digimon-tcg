import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-037.js";

describe("EX8-037", () => {
  it("plays a Uka no Mitama token when Sakuyamon or X Antibody is in its digivolution cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayToken", tokens: ["Uka no Mitama"], count: 1, payCost: false, condition: { kind: "anyOf" } }));
  it("once per turn may use an Option when one of your Digimon attacks, then unsuspends a Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking", actions: [{ kind: "UseOptionWithoutCost", from: ["hand"], optional: true }, { kind: "Unsuspend", condition: { kind: "ifThisEffectUsed" } }] }));
});
