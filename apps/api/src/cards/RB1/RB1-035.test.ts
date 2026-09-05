import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-035 Hokuto Amanokawa", () => {
  it("plays itself from Security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "RB1-035", as: "securityHokuto" }] }, 1: {} });
    const securityCard = s.inst("securityHokuto");
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, securityCard);
    expect(s.state.players[0]!.security.some((c) => c.instanceId === securityCard.instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === securityCard.instanceId)).toBe(true);
  });

  it("gains 1 memory at the start of its turn when the opponent has 3 Tamers", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-035", as: "hokuto" }] },
      1: {
        battleArea: [
          { card: "BT1-085", as: "tamer1" },
          { card: "BT1-086", as: "tamer2" },
          { card: "BT1-087", as: "tamer3" },
        ],
      },
    });
    s.state.memory = 0;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("suspends to draw once when the opponent plays one or more level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-035", as: "hokuto" }], deck: ["BT1-009"] },
        1: {
          trash: [
            { card: "BT1-009", as: "level3a" },
            { card: "BT1-009", as: "level3b" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const handBefore = s.state.players[0]!.hand.length;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("level3a").instanceId, s.inst("level3b").instanceId]);

    expect(s.perm("hokuto").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(s.state.memory).toBe(0);
  });

  it("applies both rewards once when level 3 and level 4 Digimon are played simultaneously", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-035", as: "hokuto" }], deck: ["BT1-009"] },
        1: {
          trash: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const handBefore = s.state.players[0]!.hand.length;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("level3").instanceId, s.inst("level4").instanceId]);

    expect(s.perm("hokuto").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(s.state.memory).toBe(-1);
  });

  it("may suspend for a level-less Digimon but receives neither reward", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-035", as: "hokuto" }], deck: ["BT1-009"] },
        1: { trash: [{ card: "EX2-045", as: "levelLess" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const handBefore = s.state.players[0]!.hand.length;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("levelLess").instanceId]);

    expect(s.perm("hokuto").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.memory).toBe(0);
  });
});
