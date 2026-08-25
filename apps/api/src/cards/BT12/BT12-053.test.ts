import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-053.js";

describe("BT12-053 MetallifeKuwagamon", () => {
  it("has the printed Save evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT12-053")).toContainEqual({
      level: 4,
      texts: ["Save"],
      cost: 3,
      isAlternate: true,
    });
  });

  it("gains 1 memory when the inherited Digimon deletes an opponent in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-022", as: "host", under: ["BT12-053"] }] },
    });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnBattleDeleteOpponent, s.perm("host"));
    expect(s.state.memory).toBe(1);
  });

  it("gains memory from a real battle deletion, not an unrelated timing drive", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-022", as: "host", under: ["BT12-053"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }] },
    });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it("limits the inherited memory gain to once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-022", as: "host", under: ["BT12-053"] }] },
    });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnBattleDeleteOpponent, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnBattleDeleteOpponent, s.perm("host"));
    expect(s.state.memory).toBe(1);
  });
});
