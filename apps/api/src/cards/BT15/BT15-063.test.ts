import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-063.js";

describe("BT15-063", () => {
  it("may digivolve itself into a Beast Dragon/DigiPolice from hand when a DigiPolice Tamer is stacked", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "whenEffectSuspends", actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, optional: true, condition: { kind: "selfDigivolutionStackHasTrait" } }] }] }));
  it("once per turn unsuspends a Beast Dragon/DigiPolice when an effect suspends", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectSuspends", actions: [{ kind: "Unsuspend" }] }] }));
});
