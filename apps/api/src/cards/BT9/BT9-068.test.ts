import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-068.js";

describe("BT9-068 Gaiomon", () => {
  it("matches catalog and Q1856/Q1857 rule-name, dual-color IR", () => {
    expect(getCardDefinition("BT9-068")).toMatchObject({
      cardId: "BT9-068", nameEn: "Gaiomon", colors: ["Black", "Red"], kinds: ["Digimon"], level: 6,
      playCost: 13, dp: 13000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 5 }, { color: "Red", level: 5, memoryCost: 5 }],
      forms: ["Mega"], attributes: ["Virus"], types: ["Dragonkin", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["BlackWarGreymon"], cost: 2, isAlternate: true }],
      effects: [
        { trigger: "Static", actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Greymon"] }], keywords: [{ keyword: "SecurityAttack", amount: 1 }, { keyword: "Reboot" }] },
        { trigger: "WhenDigivolving", actions: [{ kind: "DeDigivolve", amount: 1, condition: { kind: "selfDigivolutionStackHasColor" } }, { kind: "GainKeyword", keyword: { keyword: "Blitz" }, duration: "forTheTurn", condition: { kind: "selfDigivolutionStackHasColor" } }] },
      ],
    });
  });

  it("de-digivolves an opponent when it has a black digivolution card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT9-068", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target", under: [{ card: "BT2-045", as: "bottom" }] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("bottom").instanceId);
  });
});
