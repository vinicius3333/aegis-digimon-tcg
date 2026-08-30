import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-055.js";
describe("BT9-055 GrandisKuwagamon", () => {
  it("matches catalog and Q1849-Q1851 IR contract", () => {
    expect(getCardDefinition("BT9-055")).toMatchObject({
      cardId: "BT9-055", nameEn: "GrandisKuwagamon", colors: ["Green"], kinds: ["Digimon"], level: 6,
      playCost: 12, dp: 12000, evoCosts: [{ color: "Green", level: 5, memoryCost: 4 }], forms: ["Mega"],
      attributes: ["Virus"], types: ["Insectoid", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["GranKuwagamon"], cost: 1, isAlternate: true }],
      effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }, { kind: "RedirectAttack", optional: true, condition: { kind: "triggerAttackerIsSelf" } }] },
        { trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 4000, duration: "permanent" }] },
        { trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Suspend" }, { kind: "Unsuspend" }] },
      ],
    });
  });

  it("suspends an opposing Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-083", as: "base" }], hand: [{ card: "BT9-055", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
