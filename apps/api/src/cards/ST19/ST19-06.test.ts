import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST19-06.js";

describe("ST19-06 Doggymon", () => {
  it("gives one opposing Digimon Security Attack -1 on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST19-06", as: "doggy" }] },
      1: { battleArea: [{ card: "BT1-010", as: "targetA" }, { card: "BT1-011", as: "targetB" }] },
    }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("doggy"));
    await settle(() => observe(s.engine).keywordAmount(s.perm("targetA"), "SecurityAttack") === -1);
    expect(observe(s.engine).keywordAmount(s.perm("targetA"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("targetB"), "SecurityAttack")).toBe(0);
  });

  it("applies the same effect on deletion and matches the catalog text", () => {
    expect(getCardDefinition("ST19-06")).toMatchObject({
      effectText: "[On Play] [On Deletion] 1 of your opponent's Digimon gains ＜Security Attack -1＞until the end of their turn.",
    });
  });
});
