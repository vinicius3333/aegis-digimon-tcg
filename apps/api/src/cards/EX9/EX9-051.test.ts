import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-051.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-051", () => {
  it("has Training and de-digivolves an opposing Digimon by one on play and attack after placing a hand card underneath", () => {
    expect(compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Training"))?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["OnPlay", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "DeDigivolve", amount: 1, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }] });
  });
  it("uses the same optional hand-payment contract for both triggers", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ optional: true, abortOnDecline: true, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: 1, cost: { target: { filter: { zone: "hand", controller: "mine" }, count: 1 }, destination: "digivolutionStack", position: "bottom", host: "self", faceDown: true } });
  });
  it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));
  it("places a hand card face-down underneath and de-digivolves an opposing Digimon on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-051", as: "source" }], hand: ["BT1-009"] },
      1: { battleArea: [{ card: "EX9-047", as: "target", under: ["EX9-046"] }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]?.cardId).toBe("BT1-009");
    expect(s.perm("source").stack[0]?.faceUp).toBe(false);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("target").topCard.cardId).toBe("EX9-046");
  });
});
