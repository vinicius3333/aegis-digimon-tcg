import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-050.js";

describe("EX4-050 ShadowSeraphimon", () => {
  it("De-Digivolves an opposing Digimon when security is removed during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent" } } }] });
  });
  it("adds one security and reduces opposing DP by 4000 per own security on deletion", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "SecurityManipulation", op: "placeFromDeck", amount: 1 });
    expect(actions?.[1]).toMatchObject({ kind: "ModifyDP", amount: -4000, scaling: { per: 1, unit: "security" } });
  });

  it("adds security first, then scales the opposing DP reduction from the new stack", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-010"], security: ["BT1-010", "BT1-010"], battleArea: [{ card: "EX4-050", as: "source" }] },
      1: { battleArea: [{ card: "BT1-011", as: "target", dp: 20000 }] },
    }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();

    const sourceId = s.perm("source").permanentId;
    await advance(s.engine).verb.deletePermanent([sourceId], "byEffect");
    await settle(() => s.perm("target").currentDP === 8000);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.perm("target").currentDP).toBe(8000);
  });
});
