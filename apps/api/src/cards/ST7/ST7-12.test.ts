import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST7-12.js";

describe("ST7-12 Atomic Blaster", () => {
  it("deletes opposing Digimon whose selected total DP is at most 8000", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST7-02"], hand: [{ card: "ST7-12", as: "option" }] },
        1: {
          battleArea: [
            { card: "ST7-02", as: "agumon" },
            { card: "ST7-06", as: "geogreymon" },
            { card: "ST7-07", as: "rizegreymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetDecision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetDecision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("agumon").permanentId, s.perm("geogreymon").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("rizegreymon").permanentId,
    ]);
    const decision = s.decisions.find(({ req }) => req.kind === "chooseTargets")?.req;
    expect(decision?.options?.min).toBe(1);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "ST7-12", as: "option", faceUp: true }] }, 1: { battleArea: ["ST7-02"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not reinterpret an over-8000 selection as a smaller subset", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST7-02"], hand: [{ card: "ST7-12", as: "option" }] },
      1: {
        battleArea: [
          { card: "ST7-02", as: "small" },
          { card: "ST7-07", as: "large" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("small").permanentId, s.perm("large").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });
});
