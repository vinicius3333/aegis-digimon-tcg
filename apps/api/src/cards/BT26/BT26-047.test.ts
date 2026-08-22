import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-047.js";

describe("BT26-047 TyrantKabuterimon", () => {
  it("encodes immediate optional battle and the suspend-paid Option immunity/DP effect in every printed window", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [
        { kind: "Battle", optional: true }, { kind: "Suspend", optional: true }, { kind: "Restrict", restriction: "beAffected", fromSourceKind: ["Option"] }, { kind: "ModifyDP", amount: 3000 },
      ] });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({ actions: [{ kind: "Suspend" }, { kind: "Restrict" }, { kind: "ModifyDP" }] });
  });
});
