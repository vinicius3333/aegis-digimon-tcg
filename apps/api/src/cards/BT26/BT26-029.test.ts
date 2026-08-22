import { describe, expect, it } from "vitest";
import { EffectTiming, getCompiledCard } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT26-029.js";
import "../index.js";

describe("BT26-029 compiled fidelity", () => {
  it("encodes Decode/Ascension, security-paid protection, both removal watchers, Angel rule trait, and inherited De-Digivolve", () => {
    const card = getCompiledCard("BT26-029");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(expect.arrayContaining(["Decode", "Ascension"]));
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "trashTop" },
      { kind: "SelectBind" },
      { kind: "Restrict", restriction: "dpImmune" },
      { kind: "StackTrashLock" },
    ]);
    expect(card?.effects?.[2]?.actions).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldLeavePlay",
        actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, payCost: false }],
      },
    ]);
    expect(card?.effects?.[4]?.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenSecurityRemoved" },
      { kind: "SubTrigger", event: "whenEffectRemovesFromSecurity" },
    ]);
    expect(card?.effects?.[5]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "DeDigivolve", amount: 1 }] }],
    });
  });

  it("trashes its top security and protects one chosen Digimon until the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-029", as: "holy", under: ["BT24-034"] }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("holy"), "dpImmune")).toBe(true);
  });
});
