import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-034.js";
import "../index.js";
describe("BT26-034 Palmon", () => {
  it("compiles the conditional free hand digivolution", () => {
    expect(digivolutionRequirementsFor("BT26-034")).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtMost", value: 4 },
        },
      ],
    });
  });
  it("free-digivolves a Vegetation card at four memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-034", as: "palmon", under: ["BT26-001"] }],
          hand: [{ card: "BT26-039", as: "vegetation" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("palmon"));
    expect(s.perm("palmon").topCard.cardId).toBe("BT26-039");
  });

  it("Q7007 does not offer the free digivolution at five memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-034", as: "palmon", under: ["BT26-001"] }],
          hand: [{ card: "BT26-039", as: "vegetation" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("palmon"));

    expect(s.perm("palmon").topCard.cardId).toBe("BT26-034");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("vegetation").instanceId]);
    expect(s.state.memory).toBe(5);
  });

  it("inherited When Attacking suspends one opponent Digimon only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-035", as: "host", under: [{ card: "BT26-034" }] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    const trigger = { attackerPermanentId: s.perm("host").permanentId };

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), trigger);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), trigger);

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
  });
});
