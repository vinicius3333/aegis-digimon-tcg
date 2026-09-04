import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-034.js";
import { EffectTiming } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-034", () => {
  it("has Vortex and suspends one Digimon when digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]).toMatchObject({
      keyword: "Vortex",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Suspend",
      target: { count: 1 },
    });
  });
  it("restricts that Digimon from being affected when its own Digimon was suspended", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "beAffected",
      fromSourceKind: ["Digimon"],
      byOpponentEffectsOnly: true,
      duration: "untilOpponentTurnEnd",
      target: { isSelf: true, filter: { isSelfRef: true } },
      condition: { kind: "lastSuspendedIsMine" },
    }));
  it("inherits a once-per-turn self unsuspend on attack", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", condition: { kind: "attackTargetMatchesFilter" } }],
    }));

  it("suspends an own Digimon and protects itself from opposing Digimon effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-034", as: "source" },
            { card: "EX7-031", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "EX7-011", as: "opponent" }] },
      },
      { autoSelectCards: false },
    );
    await s.ready();
    const firing = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("ally").permanentId] },
      }),
    ).toEqual({ ok: true });
    await firing;
    await settle(
      () =>
        s.perm("ally").isSuspended && observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon"),
    );
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(true);
  });

  it("unsuspends its host after attacking an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-035", as: "host", under: ["EX7-034"] }] },
      1: { battleArea: [{ card: "BT1-045", as: "target", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("host").isSuspended &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId),
    );
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
