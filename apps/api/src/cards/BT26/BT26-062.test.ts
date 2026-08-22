import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-062.js";
import "../index.js";

describe("BT26-062 Ghostmon", () => {
  it("compiles the hand cost, draw, memory, and inherited DP effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects[0]!.actions.map((a) => a.kind)).toEqual(["Draw", "GainMemory"]);
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true });
  });
  it("trashes a Ghost card before drawing and gaining memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-062", as: "ghostmon" }], hand: [{ card: "BT26-062", as: "cost" }], deck: [{ card: "BT1-009", as: "drawn" }] } }, { autoSelectCards: true });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ghostmon"));
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash).toContainEqual(expect.objectContaining({ instanceId: s.inst("cost").instanceId }));
  });
});
