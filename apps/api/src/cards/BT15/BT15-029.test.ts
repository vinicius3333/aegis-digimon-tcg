import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-029.js";

describe("BT15-029", () => {
  it("places another blue Digimon as bottom source to return an opposing Digimon at or below its level", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Return", to: "deckBottom", target: { filter: { levelLte: "placedDigimonLevel" } }, cost: { kind: "place", storeAs: "placedDigimonLevel" } });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Return" }] });
  });
  it("once per turn may unsuspend by placing another blue Digimon underneath", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", cost: { kind: "place" }, optional: true }] }));
});
