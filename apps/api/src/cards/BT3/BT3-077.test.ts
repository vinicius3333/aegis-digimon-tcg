import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-077.js";
import "../BT1/BT1-090.js";
import "../ST2/ST2-13.js";

describe("BT3-077 Gazimon", () => {
  it("prevents the opponent from gaining memory through a security Option effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-077", as: "gazimon" },
          { card: "BT1-019", as: "attacker" },
        ],
      },
      1: { security: [{ card: "ST2-13", as: "hammerSpark" }] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.memory).toBe(0);
  });

  it("blocks opposing Digimon and Option gains but allows Tamer and own effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-077", as: "gazimon" }] } });
    await s.ready();

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Option"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
  });
});

describe("BT3-077 Gazimon — KB Q&A rulings", () => {
  const setupGravityCrush = (opponentBattleArea: string[]) => {
    const s = setupEngine({
      0: { battleArea: ["BT1-010"], hand: [{ card: "BT1-090", as: "gravityCrush" }], deck: ["BT1-009"] },
      1: { battleArea: opponentBattleArea, deck: ["BT1-012"] },
    });
    s.state.memory = 2;
    return s;
  };

  const useGravityCrush = async (s: ReturnType<typeof setupGravityCrush>) => {
    const optionId = s.inst("gravityCrush").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
  };

  const hammerSparkCheck = async (attackerSideBattleArea: string[]) => {
    const s = setupEngine({
      0: { battleArea: [...attackerSideBattleArea, { card: "BT1-019", as: "attacker" }] },
      1: { security: [{ card: "ST2-13", as: "hammerSpark" }] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);
    return s;
  };

  it("blocks the memory gain of an opponent's Option but still applies its end-of-turn memory loss (Q1097)", async () => {
    const control = setupGravityCrush([]);
    await useGravityCrush(control);
    expect(control.state.memory).toBe(4);

    const s = setupGravityCrush(["BT3-077"]);
    await useGravityCrush(s);
    expect(s.state.memory).toBe(2);

    await advance(s.engine).runTurn(0);

    const memoryChanges = s.events.filter((event) => event.kind === "memoryChanged");
    expect(memoryChanges).toMatchObject([
      { from: 2, to: -3, reason: "passTurn" },
      { from: -3, to: -5, reason: "gainMemory" },
    ]);
    expect(s.state.memory).toBe(-5);
  });

  it("stops the opponent from gaining memory with Hammer Spark's [Security] effect (Q1098)", async () => {
    const control = await hammerSparkCheck([]);
    expect(control.state.memory).toBe(-2);

    const s = await hammerSparkCheck(["BT3-077"]);
    expect(s.state.memory).toBe(0);
  });
});
