import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-211.js";

describe("P-211 Monica Simmons", () => {
  it("gains memory at the start of your main phase when the opponent has a Digimon", () => {
    expect(
      runtimeCompiledCard("P-211")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("restricts one opposing Digimon from attacking players until the opponent's turn ends", () => {
    expect(runtimeCompiledCard("P-211")!.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Restrict",
          restriction: "attackPlayers",
          duration: "untilOpponentTurnEnd",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("plays itself without paying the cost in security", () => {
    expect(runtimeCompiledCard("P-211")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", payCost: false, target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
      ],
    });
  });

  it("restricts an opposing Digimon from attacking players on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-211", as: "monica" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("monica"));
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers")).toBe(true);
  });
});
describe("P-211 engine behavior", () => {
  it("gains exactly 1 memory at the start of the main phase with an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-211", as: "monica" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("monica"));
    await settle();
    expect(s.state.memory).toBe(1);
  });
});
