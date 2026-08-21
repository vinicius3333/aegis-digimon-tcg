import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("ST24-07 ShineGreymon", () => {
  it("proves dual-card keywords, shared once-per-turn effects, and GeoGrey Sword's two-step Main effect", () => {
    const compiled = registeredCompiledCards.get("ST24-07") ?? getCompiledCard("ST24-07")!;
    expect(compiled.effects.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []).map((keyword) => keyword.keyword)).toEqual(["Raid", "Piercing", "SecurityAttack"]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, target: { filter: { controller: "mine", kind: ["Tamer"], playCostLte: 5 } } }, { kind: "ModifyDP", amount: -9000, duration: "forTheTurn" }] });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "Main")).toMatchObject({ actions: [{ kind: "ModifyDP", amount: -6000 }, { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } } } }] });
  });
});
