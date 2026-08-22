import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_062 } from "./BT24-062.js";
import "../index.js";

describe("BT24-062 MasterBlimpmon", () => {
  it("plays the qualifying card from this Digimon's stack at either shared timing", () => {
    const effects = BT24_062.effects?.filter((entry) => ["EndOfAttack", "EndOfOpponentsTurn"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.frequency).toBe("OncePerTurn");
      expect(effect.sharedUseKey).toBe("ir-shared-0");
      expect(effect.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"] });
      expect((effect.actions?.[0] as any).target.source).toBe("thisDigimon");
    }
  });

  it("has Blocker and Armor Purge", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-062", as: "master" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("master"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("master"), "Armor Purge")).toBe(true);
  });

  it("plays only from its own stack and shares once-per-turn use across both timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-062", as: "master", under: ["BT24-058", "BT24-058"] },
            { card: "BT24-058", as: "neighbor", under: ["BT24-058"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("master"));
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    const masterStackAfterFirst = s.perm("master").stack.length;
    const neighborStackAfterFirst = s.perm("neighbor").stack.length;

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("master"));

    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.perm("master").stack).toHaveLength(masterStackAfterFirst);
    expect(s.perm("neighbor").stack).toHaveLength(neighborStackAfterFirst);
  });

  it("inherited attack-target lock exists only during its owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-063", as: "host", under: ["BT24-062"] }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(false);
  });
});
