import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-061.js";
import "../index.js";

describe("EX9-061", () => {
  it("has Training and once per turn deletes an opposing Digimon with a level limit scaling by face-down sources when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.actions.some((action) => action.kind === "GainKeyword"))?.actions).toContainEqual(expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Training" } }));
    const action = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0] as any;
    expect(action).toMatchObject({ kind: "Delete", cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } });
    expect(action?.target?.filter?.levelComparison).toMatchObject({ op: "lte", value: 3, scaling: { unit: "selfFaceDownDigivolutionCards", per: 2 } });
  });
  it("inherits Retaliation", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions).toContainEqual(expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Retaliation" } })));
  it("places the own deck top face down for its attack effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-061", as: "source" }], deck: ["BT1-009"] }, 1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle(() => s.perm("source").stack.length === 1 && s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010"), 20);
    expect(s.perm("source").stack[0]?.faceUp).not.toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});
