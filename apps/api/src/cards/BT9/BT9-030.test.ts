import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-030.js";

describe("BT9-030 MetalPiranimon", () => {
  it("matches its complete catalog and optional source-only free-play IR", () => {
    expect(getCardDefinition("BT9-030")).toMatchObject({
      cardId: "BT9-030", nameEn: "MetalPiranimon", colors: ["Blue"], kinds: ["Digimon"], level: 6,
      playCost: 11, dp: 11000, evoCosts: [{ color: "Blue", level: 5, memoryCost: 3 }],
      forms: ["Mega"], attributes: ["Virus"], types: ["Aquatic", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [{ trigger: "WhenAttacking", actions: [{
        kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true,
        target: { filter: { nameOrTrait: [{ tokens: ["Piranimon"], match: "name" }] }, count: 1 },
      }] }],
    });
  });

  it("may play a Piranimon from its digivolution cards when attacking", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-030", as: "metal", under: [{ card: "BT9-026", as: "piranimon" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const materialId = s.perm("metal").stack[0]!.instanceId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("metal"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === materialId)).toBe(true);
  });
});
