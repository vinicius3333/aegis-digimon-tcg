import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-037.js";

describe("EX1-037 Kuwagamon", () => {
  it("suspends an opposing Digimon with 3000 DP or less at start of your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-037", as: "kuwagamon" }] }, 1: { battleArea: [{ card: "BT1-066", as: "target", dp: 3000 }] } }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kuwagamon"));
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("prevents an opposing suspended Digimon from unsuspending after its host wins a battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-040", as: "host", under: ["EX1-037"] }] }, 1: { battleArea: [{ card: "BT1-070", as: "target", suspended: true }] } }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });
});
