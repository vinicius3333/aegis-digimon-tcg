import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-025.js";

describe("EX4-025 Turuiemon", () => {
  it("reduces an opposing Digimon by 2000 after an attack when another own Digimon is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", excludeSelf: true, suspended: true, kind: ["Digimon"] } } }] });
  });

  it("requires another suspended Digimon, excluding the inherited-effect source", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfAttack");
    expect(effect?.actions?.[0]).toMatchObject({
      condition: {
        kind: "youHave",
        filter: { excludeSelf: true, suspended: true, controllerDefault: "mine" },
      },
    });
  });

  it("reduces an opponent's Digimon by 2000 after an attack when another own Digimon is suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "source", under: ["EX4-025"] }, { card: "BT1-009", as: "other", suspended: true }] },
      1: { battleArea: [{ card: "BT1-011", as: "target", dp: 8000 }] },
    }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("source"));

    expect(s.perm("target").currentDP).toBe(6000);
  });
});
