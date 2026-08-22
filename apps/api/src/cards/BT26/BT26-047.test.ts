import { describe, expect, it } from "vitest";
import { assemblyRequirementFor, digivolutionRequirementsFor } from "@aegis/shared";
import { compiled } from "./BT26-047.js";

describe("BT26-047 TyrantKabuterimon", () => {
  it("encodes immediate optional battle and the suspend-paid Option immunity/DP effect in every printed window", () => {
    expect(digivolutionRequirementsFor("BT26-047")).toContainEqual({ level: 5, traits: ["Insectoid", "TS"], cost: 3, isAlternate: true });
    expect(assemblyRequirementFor("BT26-047")).toEqual([{ reduceCost: 6, materials: [{ traits: ["Larva", "Insectoid", "Titan"], count: 4, differentLevels: true }] }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [
        { kind: "Battle", optional: true }, { kind: "Suspend", optional: true }, { kind: "Restrict", restriction: "beAffected", fromSourceKind: ["Option"] }, { kind: "ModifyDP", amount: 3000 },
      ] });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({ actions: [{ kind: "Suspend" }, { kind: "Restrict" }, { kind: "ModifyDP" }] });
  });
});
