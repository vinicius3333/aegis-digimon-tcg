import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-057.js";
import "../index.js";

describe("BT26-057 Bearcatmon", () => {
  it("encodes Digimon-effect immunity, dual All Turns unsuspend triggers, TS waiver, and granted attack", () => {
    expect(digivolutionRequirementsFor("BT26-057")).toContainEqual({ level: 4, traits: ["Glowing Dawn"], cost: 3, isAlternate: true });
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "TrashDigivolution", fromTop: false }, { kind: "Restrict", restriction: "beAffected", fromSourceKind: ["Digimon"] }, { kind: "ModifyDP", amount: 3000 }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAttackTargetSwitched" }, { kind: "SubTrigger", event: "whenDigivolutionTrashed" }] });
    expect(compiled.effects?.[2]?.actions).toContainEqual(expect.objectContaining({ kind: "WaiveColorRequirement" }));
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "Main", actions: [{ kind: "DeDigivolve", amount: 1 }, { kind: "GainTriggeredEffect", gainedTrigger: "StartOfYourMainPhase" }] });
  });

  it("publicly pays with a face-down Tamer card and gains DP plus Digimon-effect immunity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-057", as: "bearcatmon" },
          { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bearcatmon"));

    expect(s.perm("bearcatmon").currentDP).toBe(11000);
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).not.toContain("BT1-010");
    const continuous = (s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string, source?: string) => boolean } }).continuous;
    expect(continuous.hasRestriction(s.perm("bearcatmon").permanentId, "beAffected", "Digimon")).toBe(true);
  });
});
