import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-027.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-027", () => {
  it("has Puppet Overclock and plays a level 3 Puppet from hand when digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]).toMatchObject({ keyword: "Overclock" });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { count: 1 } });
  });
  it("inherits a once-per-turn leave-play replacement", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay" }] }));

  it("plays a level 3 Puppet from hand when digivolving", async () => {
    const s = setupEngine({ 0: { hand: ["EX7-024"], battleArea: [{ card: "EX7-027", as: "chap" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("chap"));
    await settle(() => s.state.players[0].battleArea.some((permanent) => permanent.topCard.cardId === "EX7-024"));
    expect(s.state.players[0].battleArea.some((permanent) => permanent.topCard.cardId === "EX7-024")).toBe(true);
  });
});
