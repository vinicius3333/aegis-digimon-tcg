import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-028.js";
import "../index.js";

describe("BT16-028", () => {
  it("restricts an opposing Digimon or Tamer and unsuspends yours", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "suspend" },
    });
  });

  it("can DNA digivolve into Imperialdramon: Fighter Mode when an opponent's effect plays or digivolves", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      actions: [{ kind: "Digivolve", payCost: false, from: ["hand"], optional: true }],
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
    });
  });

  it("restricts an opponent and pays by suspending them to unsuspend your Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-028", as: "source", suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
  });
});
