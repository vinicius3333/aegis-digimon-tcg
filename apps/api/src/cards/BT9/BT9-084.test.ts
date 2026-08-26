import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-084.js";
import "./BT9-084.js";

describe("BT9-084 Tai Kamiya & Kari Kamiya", () => {
  it("matches catalog values and the independent memory, DP, and security IR", () => {
    expect(getCardDefinition("BT9-084")).toMatchObject({
      colors: ["Red", "Yellow"], kinds: ["Tamer"], playCost: 4,
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [],
      effects: [
        { trigger: "StartOfYourTurn", actions: [{ kind: "GainMemory", condition: { kind: "zoneCount", seat: "mine", value: 3 } }, { kind: "GainMemory", condition: { kind: "zoneCount", seat: "opponent", value: 3 } }] },
        { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenAttacking", sourceFilter: { colors: ["Red", "Yellow"] }, actions: [{ kind: "ModifySecurityDP", amount: -2000, duration: "forTheTurn", cost: { kind: "suspend" } }] }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("independently gains memory for each player at 3 or fewer security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-084", as: "tamer" }], security: ["BT1-001"] },
      1: { security: ["BT1-002"] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(2);
  });

  it("may suspend to give all opposing Security Digimon -2000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-084", as: "tamer" },
            { card: "BT9-008", as: "attacker" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(observe(s.engine).securityDp(1)).toBe(-2000);
  });
});
