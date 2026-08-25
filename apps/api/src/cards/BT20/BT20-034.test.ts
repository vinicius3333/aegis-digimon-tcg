import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-034.js";
import "./index.js";

describe("BT20-034 Boutmon", () => {
  it("has Fortitude, restricts one opponent Digimon after a Tamer enters the stack, and trashes security on inherited battle deletion", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Fortitude", raw: "＜Fortitude＞" },
    ]);
    const main = compiled.effects.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    expect(main).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { kind: ["Tamer"] },
          actions: [
            {
              kind: "Restrict",
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, texts: ["Pulsemon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["SEEKERS"], cost: 3, isAlternate: true },
    ]);
  });

  it("has Fortitude and restricts an opponent after a Tamer enters its source stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-034", as: "boutmon" }],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("boutmon"), "Fortitude")).toBe(true);
    await advance(s.engine).verb.placeUnder(s.perm("boutmon").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));
  });

  it("inherits one opposing top-security trash after its host deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-035", as: "host", under: ["BT20-034"] }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }],
        security: ["BT20-001", "BT20-002"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });
});
