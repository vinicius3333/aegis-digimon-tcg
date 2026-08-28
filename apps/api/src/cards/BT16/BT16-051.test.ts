import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-051.js";
import "../index.js";

describe("BT16-051", () => {
  it("places Kosuke Kisakata from hand under itself for leave/deletion protection", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GrantStatic",
          grant: "cantLeaveExceptByOwnerOrDeletion",
          duration: "untilOpponentTurnEnd",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" },
        },
      ],
    });
  });

  it("has inherited permanent DP", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("places Kosuke underneath and protects the Dorumon from returns live", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-051", as: "dorumon" }],
          hand: [{ card: "BT16-087", as: "kosuke" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("dorumon"));

    expect(s.perm("dorumon").stack.at(-1)?.cardId).toBe("BT16-087");
    expect(observe(s.engine).isRestricted(s.perm("dorumon"), "beReturned")).toBe(true);
  });
});
