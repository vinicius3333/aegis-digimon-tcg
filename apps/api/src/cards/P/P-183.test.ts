import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-183.js";

describe("P-183 Gaiomon", () => {
  it("encodes Reboot, Blocker, and the temporary opponent attack grant", () => {
    const card = runtimeCompiledCard("P-183")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Reboot", raw: "＜Reboot＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          effectText: "[Start of Your Main Phase] This Digimon attacks.",
          duration: "untilOpponentTurnEnd",
        },
        { kind: "Attack", optional: true, withoutSuspending: false, target: { isSelf: true, count: 1 } },
      ],
    });
  });

  it("trashes the opponent's top security card once per turn when an attack target changes", () => {
    expect(runtimeCompiledCard("P-183")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenAttackTargetSwitched",
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });

  it("exposes Reboot and Blocker on the live Gaiomon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-183", as: "gaiomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gaiomon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("gaiomon"), "Blocker")).toBe(true);
  });
});
