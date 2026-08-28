import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-015.js";

describe("BT3-015 MetalGreymon", () => {
  it("returns a level 7 Virus Digimon from trash and has Piercing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-001", as: "base" }],
          hand: [{ card: "BT3-015", as: "evolving" }],
          trash: [{ card: "BT2-083", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p.hand.some((c) => c.instanceId === s.inst("target").instanceId));
    await s.engine.recomputeContinuousEffects();
    expect(p.trash).toHaveLength(0);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });

  it("may decline the optional trash-to-hand return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-001", as: "base" }],
          hand: [{ card: "BT3-015", as: "evolving" }],
          trash: [{ card: "BT2-083", as: "target" }],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-083")).toBe(true);
  });
});
