import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-034.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-034", () => {
  it("has Training", () => expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" }));
  it("inherits Piercing", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Piercing", raw: "＜Piercing＞" }));

  it("activates Training by suspending and placing the deck top face-down underneath", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-034", as: "source" }], deck: ["BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.turnSeat = 0;
    const source = s.perm("source");
    const [entry] = observe(s.engine).activatableEffects(source) as Array<{ effectKey: string; instanceId: string }>;
    expect(entry?.instanceId).toBe(source.topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: entry.instanceId, effectKey: entry.effectKey })).toEqual({ ok: true });
    await settle(() => source.stack.length === 1);
    expect(source.isSuspended).toBe(true);
    expect(source.stack[0]?.faceUp).toBe(false);
    expect(s.state.players[0].deck).toHaveLength(0);
  });
});
