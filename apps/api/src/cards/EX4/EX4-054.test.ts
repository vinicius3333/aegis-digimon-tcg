import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-054.js";

describe("EX4-054 Wendigomon", () => {
  it("adds a suspended Digimon's DP and Security Attack plus one for the attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "AddDPFromSuspendedCost",
          dpSource: { kind: "suspendedTarget" },
          alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }],
        },
      ],
    });
  });
  it("returns a green Digimon from trash once per turn when another own Digimon is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { zone: "trash", colors: ["Green"] } },
          condition: { kind: "youHave", filter: { excludeSelf: true, suspended: true } },
        },
      ],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-054");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("suspends another Digimon to add its DP and Security Attack for the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "attacker", dp: 3000, under: ["EX4-054"] },
            { card: "BT1-010", as: "fodder", dp: 2000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle(() => s.perm("fodder").isSuspended);
    expect(s.perm("fodder").isSuspended).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
  });

  it("returns a green Digimon from trash at end of attack when another is suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "attacker", under: ["EX4-054"] },
            { card: "BT1-010", as: "suspended", suspended: true },
          ],
          trash: [{ card: "BT1-064", as: "greenTrash" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("attacker"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greenTrash").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("greenTrash").instanceId);
  });
  ex4CardBehaviorTests("EX4-054");
});
