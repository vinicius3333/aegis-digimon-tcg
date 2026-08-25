import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-029.js";
import "./index.js";

describe("BT20-029 Pulsemon", () => {
  it("covers the printed alternate evolution requirements and both clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Bibimon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["SEEKERS"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "YourTurn" });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenBattleDeleteOpponent",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("reduces a qualifying battle-area evolution by 1 but not the same breeding evolution", async () => {
    const battle = setupEngine({
      0: {
        battleArea: [{ card: "BT20-029", as: "pulsemon" }],
        hand: [{ card: "BT17-034", as: "destination" }],
      },
    });
    battle.state.turnSeat = 0;
    await battle.ready();
    battle.state.memory = 3;
    expect(
      battle.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: battle.perm("pulsemon").permanentId,
        instanceId: battle.inst("destination").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => battle.perm("pulsemon").topCard.cardId === "BT17-034");
    expect(battle.state.memory).toBe(1);

    const breeding = setupEngine({
      0: {
        breeding: { card: "BT20-029", as: "pulsemon" },
        hand: [{ card: "BT17-034", as: "destination" }],
      },
    });
    breeding.state.turnSeat = 0;
    await breeding.ready();
    breeding.state.memory = 3;
    expect(
      breeding.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breeding.perm("pulsemon").permanentId,
        instanceId: breeding.inst("destination").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => breeding.perm("pulsemon").topCard.cardId === "BT17-034");
    expect(breeding.state.memory).toBe(0);
  });

  it("inherits a once-per-turn memory gain after the host deletes an opponent in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "host", under: ["BT20-029"] }] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const memoryBefore = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnBattleDeleteOpponent, s.perm("host"));
    expect(s.state.memory).toBe(memoryBefore + 1);
    await advance(s.engine).fire(EffectTiming.OnBattleDeleteOpponent, s.perm("host"));
    expect(s.state.memory).toBe(memoryBefore + 1);
  });
});
