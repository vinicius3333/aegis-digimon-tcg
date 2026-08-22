import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-102.js";
import "../index.js";

describe("BT16-102", () => {
  it("models Blocker and Armor Purge", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }, { keyword: "Armor Purge" }],
    });
  });

  it("gains DP, immunity, and unsuspends when the Armor Form condition is met", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "GrantImmunity",
      immuneFrom: "opponentEffects",
      duration: "untilOpponentTurnEnd",
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({ kind: "Unsuspend" });
  });

  it("activates its When Digivolving effect after security removal and gains Free", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [{ kind: "ActivateEffect", effectType: "WhenDigivolving", optional: true }],
        },
        { kind: "GrantStatic", grant: "trait", tokens: ["Free"] },
      ],
    });
  });

  it("unsuspends after security removal even when the stack condition is absent", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT16-102", as: "magna" }], security: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("magna").isSuspended = true;

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });

    expect(s.perm("magna").isSuspended).toBe(false);
  });
});
