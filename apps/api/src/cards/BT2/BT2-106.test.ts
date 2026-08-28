import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-106.js";

describe("BT2-106 Infinity Cannon", () => {
  it("De-Digivolves one selected opposing Digimon by up to four cards and stops at level 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-052", as: "own" }], hand: [{ card: "BT2-106", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT2-083", as: "target", under: ["BT2-052", "BT2-056", "BT2-060", "BT2-064"] },
          { card: "BT2-046", as: "other", under: ["BT2-044"] },
        ],
      },
    });
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT2-052");

    expect(s.perm("target").topCard.cardId).toBe("BT2-052");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("other").topCard.cardId).toBe("BT2-046");
    expect(s.perm("other").stack).toHaveLength(1);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT2-083", "BT2-064", "BT2-060", "BT2-056"]),
    );
  });

  it("stops when the target has no more digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-052"], hand: [{ card: "BT2-106", as: "option" }] },
        1: { battleArea: [{ card: "BT2-046", as: "target", under: ["BT2-044"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT2-044");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => cardId === "BT2-046")).toHaveLength(1);
  });

  it("activates the same De-Digivolve 4 effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT2-106", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT2-064", as: "target", under: ["BT2-052", "BT2-056", "BT2-060"] }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").topCard.cardId).toBe("BT2-052");
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
