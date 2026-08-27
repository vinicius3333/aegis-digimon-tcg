import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-097.js";

describe("BT14-097", () => {
  it("digivolves a non-white Digimon into Sukamon from hand without cost", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Digivolve", payCost: false, ignoreRequirements: true }],
    }));
  it("changes one opposing Digimon into a white 3000 DP Sukamon in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      actions: [
        { kind: "SetBaseDP", value: 3000 },
        { kind: "GrantStatic", grant: { dp: 3000, color: "white", originalName: "Sukamon" } },
      ],
    }));
});
