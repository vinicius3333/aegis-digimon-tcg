import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-067.js";

describe("BT19-067", () => {
  it("preserves the one-or-fewer-Tamers purple Tamer trash play and inherited Retaliation", () => {
    const card = runtimeCompiledCard("BT19-067");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { kind: ["Tamer"], colors: ["Purple"], playCostLte: 4 } },
            from: ["trash"],
            payCost: false,
            condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
            optional: true,
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Retaliation" }] },
    ]);
  });
});
