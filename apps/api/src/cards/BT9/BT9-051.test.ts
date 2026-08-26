import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-051.js";

describe("BT9-051 Panjyamon (X Antibody)", () => {
  it("matches catalog and Q1848 rule-name plus exact Leomon replacement IR", () => {
    expect(getCardDefinition("BT9-051")).toMatchObject({
      cardId: "BT9-051", nameEn: "Panjyamon (X Antibody)", colors: ["Green", "Blue"], kinds: ["Digimon"], level: 5,
      playCost: 7, dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }, { color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"], attributes: ["Vaccine"], types: ["Beastkin", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Panjyamon"], cost: 0, isAlternate: true }],
      effects: [
        { trigger: "Static", actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Leomon"] }] },
        { trigger: "AllTurns", actions: [{ kind: "Replacement", event: "wouldBeDeleted", mode: "instead", leaveCause: "byBattle" }] },
      ],
    });
  });

  it("may play a Leomon source before its host is deleted in battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-051", as: "host", under: [{ card: "BT1-035", as: "leomon" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const leomonId = s.perm("host").stack[0]!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === leomonId)).toBe(true);
  });

  it("does not play the Leomon source when deleted by an effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-051", as: "host", under: [{ card: "BT1-035", as: "leomon" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const leomonId = s.perm("host").stack[0]!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === leomonId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === leomonId)).toBe(true);
  });
});
