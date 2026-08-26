import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-050.js";

describe("BT9-050 Leomon (X Antibody)", () => {
  it("matches catalog and Q1847 exact-name battle-replacement IR", () => {
    expect(getCardDefinition("BT9-050")).toMatchObject({
      cardId: "BT9-050", nameEn: "Leomon (X Antibody)", colors: ["Green", "Blue"], kinds: ["Digimon"], level: 4,
      playCost: 5, dp: 5000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }, { color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"], attributes: ["Vaccine"], types: ["Beastkin", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Leomon"], cost: 0, isAlternate: true }],
      effects: [{ trigger: "AllTurns", actions: [{ kind: "Replacement", event: "wouldBeDeleted", mode: "instead", leaveCause: "byBattle", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true, target: { filter: { nameOrTrait: [{ tokens: ["Leomon"], match: "name" }] } } }] }] }],
    });
  });

  it("may play a Leomon source before its host is deleted in battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-050", as: "host", under: [{ card: "BT1-035", as: "leomon" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const leomonId = s.perm("host").stack[0]!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === leomonId)).toBe(true);
  });
});
