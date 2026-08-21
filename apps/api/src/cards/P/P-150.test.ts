import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-150.js";

describe("P-150 Exermon", () => {
  it("encodes both When Digivolving branches, including the exact-three overlap", () => {
    const effect = runtimeCompiledCard("P-150")!.effects[0]!;
    expect(effect.trigger).toBe("WhenDigivolving");
    expect(effect.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
        condition: expect.objectContaining({ kind: "securityAtLeast", value: 3 }),
      }),
      expect.objectContaining({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
        condition: expect.objectContaining({ kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 }),
      }),
    ]));
  });

  it("encodes the inherited once-per-turn DP-relative suspension", () => {
    const inherited = runtimeCompiledCard("P-150")!.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenSuspended",
        sourceFilter: { isSelfRef: true },
        actions: [{ kind: "Suspend", target: expect.objectContaining({ filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } }, count: 1 }) }],
      }],
    });
  });
});
