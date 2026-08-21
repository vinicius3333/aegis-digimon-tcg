import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./ST18-12.js";

describe("ST18-12 Zephagamon", () => {
  it("behaviorally suspends one target then unsuspends another when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST18-10", as: "base", suspended: true },
          ],
          hand: [{ card: "ST18-12", as: "zephagamon" }],
        },
        1: { battleArea: [{ card: "ST18-03", as: "opponentTarget" }] },
      },
      { autoSelectCards: false },
    );
    const zephagamon = s.inst("zephagamon");
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: zephagamon.instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspendDecision = s.decisions.at(-1)!.req;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: suspendDecision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("opponentTarget").permanentId] },
    })).toEqual({ ok: true });
    await settle(() => s.perm("opponentTarget").isSuspended && s.state.pendingDecision?.kind === "chooseTargets");
    const unsuspendDecision = s.decisions.at(-1)!.req;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: unsuspendDecision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("base").permanentId] },
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").isSuspended === false);

    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("reacts to an unsuspended Digimon with +3000 DP and opponent Digimon-effect immunity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST18-12", as: "zephagamon", under: ["ST18-10"] },
          { card: "ST18-03", as: "unsuspending", suspended: true },
        ],
      },
    });

    await advance(s.engine).verb.unsuspend([s.perm("unsuspending").permanentId]);

    expect(s.perm("zephagamon").currentDP).toBe(14000);
    expect(observe(s.engine).hasRestriction(s.perm("zephagamon"), "beAffected", "Digimon")).toBe(true);
  });

  it("publishes Vortex, the unrestricted Digimon targets, and the Bird Dragon rule trait", () => {
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Vortex" })],
    }));
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "WhenDigivolving",
      actions: expect.arrayContaining([
        expect.objectContaining({ kind: "Suspend", target: expect.objectContaining({ filter: expect.objectContaining({ controllerDefault: "any" }) }) }),
        expect.objectContaining({ kind: "Unsuspend", target: expect.objectContaining({ filter: expect.objectContaining({ controllerDefault: "any" }) }) }),
      ]),
    }));
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "Rule",
      actions: [expect.objectContaining({ grant: "trait", tokens: ["Bird Dragon"] })],
    }));
  });
});
