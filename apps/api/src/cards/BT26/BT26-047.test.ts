import { describe, expect, it } from "vitest";
import { assemblyRequirementFor, digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-047.js";
import "../index.js";

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

  it("publicly buffs suspended Insectoid or Titan Digimon and protects them from opposing Options", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-047", as: "tyrant" },
          { card: "BT26-045", as: "eligible", suspended: true },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("tyrant"));

    expect(s.perm("eligible").currentDP).toBe(14000);
    const continuous = (s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string, source?: string) => boolean } }).continuous;
    expect(continuous.hasRestriction(s.perm("eligible").permanentId, "beAffected", "Option")).toBe(true);
  });
});
