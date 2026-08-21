import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-017.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-017", () => {
  it("has Training and trashes 1 opposing digivolution card by placing a card from hand face-down underneath on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 1, cost: { kind: "place", destination: "digivolutionStack", faceDown: true } });
  });
  it("inherits Jamming", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Jamming", raw: "＜Jamming＞" }));

  it("trashes an opposing digivolution card while placing a hand card face down underneath", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-017", as: "source" }], hand: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-009", as: "target", under: ["BT1-001"] }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]!.faceUp).toBe(false);
  });
});
