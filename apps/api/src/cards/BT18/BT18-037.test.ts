import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-037.js";

describe("BT18-037 Lobomon", () => {
  it("adds an exact Hybrid security card and recovers the exact deck card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-037", as: "lobomon" }],
          security: [{ card: "BT12-009", as: "hybrid", faceUp: true }, "BT1-001"],
          deck: ["BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const resolving = advance(s.engine).fireForInstance(EffectTiming.WhenDigivolving, s.perm("lobomon").topCard!);
    await settle(() => s.decisions.length > 0);
    const decision = s.decisions[0]!.req;
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: decision.decisionId, response: { kind: "optional", accept: true } })).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-002")).toBe(true);
  });
});
