import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-056.js";

describe("BT23-056 WereGarurumon", () => {
  it("grants the chosen opponent a delayed forced attack only while a CS Tamer is present", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-056", as: "were" }],
          battleArea: [
            { card: "BT22-083", as: "csTamer" },
            { card: "BT1-009", as: "sink", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("were").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-056"));
    await settle(() => false, 120);
    expect(s.perm("victim").isSuspended).toBe(false);

    s.state.turnSeat = 1;
    void (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    await settle(() => s.perm("victim").isSuspended);
    expect(s.perm("victim").isSuspended).toBe(true);
  });

  it("uses its inherited target-change trigger to de-digivolve exactly once", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-057", as: "host", under: ["BT23-056"] }] },
      1: { battleArea: [{ card: "BT23-056", as: "target", under: ["BT1-009", "BT1-010"] }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("target").stack).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("has Blocker", () => {
    expect((compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      duration: "permanent",
    });
  });

  it("grants one opposing Digimon a start-of-main-phase attack only with a CS Tamer", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "SubTrigger",
        event: "startOfYourMainPhase",
        condition: { kind: "youHave", filter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] } },
        on: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        duration: "untilOpponentTurnEnd",
        actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true } }],
      });
    }
  });

  it("inherited once-per-turn De-Digivolves an opposing Digimon when attack targets change", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "DeDigivolve",
              amount: 1,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });
});
