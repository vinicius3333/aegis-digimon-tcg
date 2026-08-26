import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-073.js";

describe("BT9-073 Sangloupmon", () => {
  it("matches catalog and Q1866/Q1867 paid trash evolution IR", () => {
    expect(getCardDefinition("BT9-073")).toMatchObject({
      cardId: "BT9-073", nameEn: "Sangloupmon", colors: ["Purple"], kinds: ["Digimon"], level: 4,
      playCost: 5, dp: 5000, evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }], forms: ["Champion"],
      attributes: ["Virus"], types: ["Dark Animal"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [{ trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "Digivolve", from: ["trash"], payCost: true, optional: true, into: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }] } } }] }],
    });
  });

  it("lets its host digivolve from trash into an Undead or Dark Animal when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-075", as: "host", under: ["BT9-073"] }],
          trash: [{ card: "BT9-077", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("evolution").instanceId);
  });
});
