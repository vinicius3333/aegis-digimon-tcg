import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-032.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-032", () => {
  it("plays a Puppet Digimon from hand by deleting an own Token or other Puppet", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, cost: { kind: "deleteOwn" } }] });
  });
  it("inherits once-per-turn leaving-play prevention with the same deletion cost", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "otherThanYourEffect", cost: { kind: "deleteOwn" } }] }));

  it("deletes the supporting Puppet and digivolves from hand without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-032", as: "source" }, { card: "EX9-024", as: "cost" }], hand: ["EX9-033"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("source").topCard?.cardId === "EX9-033");
    expect(s.perm("source").topCard?.cardId).toBe("EX9-033");
    expect(s.state.players[0].battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-033" && permanent.permanentId !== s.perm("source").permanentId)).toBe(false);
    expect(s.state.players[0].trash.some((card) => card.cardId === "EX9-024")).toBe(true);
  });
});
