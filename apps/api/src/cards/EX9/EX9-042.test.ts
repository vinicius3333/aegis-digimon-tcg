import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-042.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-042", () => {
  it("suspends and restricts an opposing Digimon on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend" },
          { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
        ],
      });
  });
  it("once per turn may digivolve after an effect suspends an own WG Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          triggerFilter: { nameOrTrait: [{ tokens: ["WG"], match: "trait" }] },
          actions: [{ kind: "Digivolve", payCost: false, from: ["hand"] }],
        },
      ],
    }));
  it("inherits once-per-turn unsuspend at end of your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend" }],
    }));

  it("suspends one opposing Digimon and prevents it from unsuspending", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-042", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspend" },
            { card: "BT1-010", as: "restrict" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("suspend").isSuspended);
    expect(s.perm("suspend").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("suspend"), "unsuspend")).toBe(true);
  });
});
