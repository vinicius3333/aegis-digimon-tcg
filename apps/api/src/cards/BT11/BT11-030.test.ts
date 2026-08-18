import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-030.js";

describe("BT11-030 MetalGreymon + Cyber Launcher", () => {
  it("is also treated as MetalGreymon and Cyberdramon and has Armor Purge", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-030", as: "launcher" }] } });
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("launcher"))).toEqual([
      "metalgreymon + cyber launcher",
      "metalgreymon",
      "cyberdramon",
    ]);
    expect(observe(s.engine).hasKeyword(s.perm("launcher"), "ArmorPurge")).toBe(true);
  });

  it("another copy placed from under a Tamer counts as Cyberdramon and enables the level 4 return", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-095", as: "tamer", under: [{ card: "BT11-030", as: "material" }] }],
        hand: [{ card: "BT11-030", as: "launcher" }],
      },
      1: { battleArea: [{ card: "AD1-001", as: "level4" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    const targetInstanceId = s.perm("level4").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("launcher").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some(({ instanceId }) => instanceId === targetInstanceId));

    const launcher = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.instanceId === s.inst("launcher").instanceId)!;
    expect(launcher.stack.map(({ instanceId }) => instanceId)).toContain(s.inst("material").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toContain(targetInstanceId);
  });
});
