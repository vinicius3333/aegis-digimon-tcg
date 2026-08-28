import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-025.js";
import "../index.js";

describe("EX4-025 Turuiemon", () => {
  it("adds another suspended Digimon's DP and gains Rush for the attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      actions: [
        {
          kind: "AddDPFromSuspendedCost",
          dpSource: { kind: "suspendedTarget" },
          duration: "forThisAttack",
          alsoGainKeywords: [{ keyword: "Rush" }],
          cost: { kind: "suspend", target: { filter: { controller: "mine", excludeSelf: true } } },
        },
      ],
    });
  });

  it("suspends the chosen other Digimon and adds its DP when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-025", as: "attacker" },
            { card: "BT1-010", as: "fodder" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const dpBefore = s.perm("attacker").currentDP;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle(() => s.perm("fodder").isSuspended);

    expect(s.perm("fodder").isSuspended).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(dpBefore + 2000);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Rush")).toBe(true);
  });

  it("reduces an opposing Digimon by 2000 after an attack when another own Digimon is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              excludeSelf: true,
              suspended: true,
              kind: ["Digimon"],
            },
          },
        },
      ],
    });
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
});
