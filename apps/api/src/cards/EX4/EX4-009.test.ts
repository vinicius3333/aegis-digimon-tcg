import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-009.js";
import "../index.js";

describe("EX4-009 RizeGreymon", () => {
  it("reduces one opponent Digimon and all opponent security Digimon by 4000 on digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toEqual([
      expect.objectContaining({ kind: "ModifyDP", amount: -4000, duration: "forTheTurn", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }),
      expect.objectContaining({ kind: "ModifySecurityDP", controller: "opponent", amount: -4000, duration: "forTheTurn" }),
    ]);
  });
  it("inherits the same pair after a red or yellow Tamer is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] } }] });
  });

  it("reduces one opposing Digimon and the opponent's security Digimon DP on digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX4-009", as: "rize" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }], security: ["BT1-009"] } });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("rize"));

    expect(s.perm("target")).toBeDefined();
    expect(observe(s.engine).securityDp(1)).toBe(-4000);
  });
});
