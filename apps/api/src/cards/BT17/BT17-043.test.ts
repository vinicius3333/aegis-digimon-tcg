import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-043.js";

describe("BT17-043 Terriermon", () => {
  it("triggers once per turn from Terriermon/Lopmon or any green Tamer played by an effect", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect!.actions[0]).toMatchObject({ event: "whenPlayed", sourceFilter: { controller: "mine", orFilters: [{ kind: ["Digimon"], nameOrTrait: [{ tokens: ["Terriermon", "Lopmon"], match: "name" }] }, { kind: ["Tamer"], colors: ["Green"] }] } });
  });

  it("gains 1000 DP while suspended as an inherited effect", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } }] });
  });
});
