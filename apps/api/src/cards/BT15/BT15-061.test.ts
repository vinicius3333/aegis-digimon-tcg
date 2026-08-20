import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-061.js";

describe("BT15-061", () => {
  it("has Blocker and may trash a Machine/Cyborg to protect one of your Digimon from deletion", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Restrict", restriction: "beDeleted", byOpponentEffectsOnly: true, cost: { kind: "trash" }, optional: true }] });
  });
  it("restricts attacks when the opponent has no Digimon and unsuspends as inherited", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "Aura", effect: { restriction: "attack" }, while: { kind: "opponentHasNone" } }] });
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "Static", isInherited: true, actions: [{ kind: "Unsuspend" }] });
  });
});
