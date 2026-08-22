import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_055 } from "./BT24-055.js";
import "../index.js";

describe("BT24-055 Ginryumon", () => {
  it("limits the inherited suspension target to the source's play cost", () => {
    const inherited = BT24_055.effects?.find((entry) => entry.isInherited);
    const action = inherited?.actions?.[0] as any;
    expect(action).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(action.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLteTriggerSource: true } },
    });
  });
  it("requires Shuu Yulin as the On Play/When Digivolving placement cost", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_055.effects?.find((entry) => entry.trigger === trigger);
      const action = effect?.actions?.[0] as any;
      expect(action).toMatchObject({ optional: true, abortOnDecline: true });
      expect(action.cost).toMatchObject({
        kind: "place",
        position: "bottom",
        target: { filter: { namesExact: ["Shuu Yulin"] } },
      });
    }
  });

  it("places exact Shuu Yulin under itself and protects a DigiPolice Digimon from opposing De-Digivolve", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-055", as: "ginryumon" },
            { card: "BT24-054", as: "target" },
          ],
          hand: [{ card: "BT15-087", as: "shuu" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ginryumon"));

    expect(s.perm("ginryumon").stack[0]!.instanceId).toBe(s.inst("shuu").instanceId);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "cantBeDeDigivolved", "Digimon")).toBe(true);
  });

  it("may decline the placement cost and grants no protection", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-055", as: "ginryumon" },
            { card: "BT24-054", as: "target" },
          ],
          hand: [{ card: "BT15-087", as: "shuu" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ginryumon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shuu").instanceId);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "cantBeDeDigivolved", "Digimon")).toBe(false);
  });

  it("inherited effect responds only when its own host suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-056", as: "host", under: ["BT24-055"] },
            { card: "BT1-009", as: "neighbor" },
          ],
        },
        1: { battleArea: [{ card: "BT1-088", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("neighbor").permanentId]);
    expect(s.perm("target").isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
