import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-044.js";

describe("BT23-044 Lilamon", () => {
  it("trashes the opponent's top security after its carrier deletes a Digimon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-046", as: "host", under: ["BT23-044"] }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
        security: [
          { card: "BT1-010", as: "topSecurity" },
          { card: "BT1-011", as: "bottomSecurity" },
        ],
      },
    });
    await s.ready();
    const targetId = s.perm("target").permanentId;
    const topSecurityId = s.inst("topSecurity").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((card) => card.permanentId === targetId));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === topSecurityId)).toBe(true);
  });

  it("reduces its play cost when the required Yuuko or CS condition is present", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 3,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Yuuko Kamishiro"], match: "name" },
                { tokens: ["CS"], match: "trait" },
              ],
            },
          },
        },
      ],
    });
  });

  it("restricts one of your eligible Digimon from returning to hand or deck after paying the suspend cost", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Restrict",
        target: {
          filter: {
            controller: "mine",
            or: [{ trait: "Vegetation" }, { trait: "Plant" }, { trait: "Fairy" }, { trait: "CS" }],
          },
          count: 1,
        },
        restriction: "cannotReturnToHandOrDeck",
        duration: "untilOpponentTurnEnd",
        cost: { kind: "suspend", target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 } },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("inherits the once-per-turn battle deletion security trash", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });
});
