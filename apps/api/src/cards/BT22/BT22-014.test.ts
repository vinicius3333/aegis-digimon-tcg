import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-014.js";

describe("BT22-014 Gaiomon", () => {
  it("keeps Raid/Reboot, the optional unsuspend-then-attack, and target-switch reaction", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] }),
    );
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions).toEqual([
      expect.objectContaining({
        kind: "Unsuspend",
        optional: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      }),
      expect.objectContaining({
        kind: "Attack",
        optional: true,
        withoutSuspending: false,
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      }),
    ]);
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttackTargetSwitched",
      actions: [
        expect.objectContaining({
          kind: "GainKeyword",
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "forTheTurn",
        }),
        expect.objectContaining({ kind: "ModifyDP", amount: 5000, duration: "forTheTurn" }),
      ],
    });
  });

  it("unsuspends one opposing Digimon during the When Digivolving effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-014", as: "gaiomon" }] },
        1: { battleArea: [{ card: "BT22-010", suspended: true, as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const pending = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gaiomon"));
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"), 60);
    let prompt = s.decisions.find((decision) => decision.req.kind === "optional");
    expect(prompt).toBeDefined();
    if (prompt !== undefined) {
      s.engine.applyIntent(prompt.seat, {
        type: "respondDecision",
        decisionId: prompt.req.decisionId,
        response: { kind: "optional", accept: true },
      });
    }
    await settle(
      () =>
        s.decisions.some(
          (decision) => decision.req.kind === "optional" && decision.req.decisionId !== prompt?.req.decisionId,
        ),
      60,
    );
    prompt = s.decisions.find(
      (decision) => decision.req.kind === "optional" && decision.req.decisionId !== prompt?.req.decisionId,
    );
    expect(prompt).toBeDefined();
    if (prompt !== undefined) {
      s.engine.applyIntent(prompt.seat, {
        type: "respondDecision",
        decisionId: prompt.req.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    await pending;

    expect(s.perm("opponent").isSuspended).toBe(false);
  });

  it("gains Piercing and exactly +5000 DP once when an attack target changes", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-014", as: "gaiomon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("gaiomon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("gaiomon"), "Reboot")).toBe(true);
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("gaiomon").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("gaiomon").permanentId,
    });

    expect(observe(s.engine).hasPierce(s.perm("gaiomon"))).toBe(true);
    expect(s.perm("gaiomon").currentDP).toBe(18000);
  });
});
