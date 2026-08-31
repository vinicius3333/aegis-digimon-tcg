import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-044.js";

describe("BT23-044 Lilamon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-044")).toMatchObject({
      cardId: "BT23-044",
      nameEn: "Lilamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Fairy", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["Yuuko", { battleArea: [{ card: "BT22-083", as: "condition" }] }],
    ["CS Digimon", { battleArea: [{ card: "BT23-041", as: "condition" }] }],
    ["neither", {}],
  ])("charges the correct play cost with %s", async (label, conditionBoard) => {
    const s = setupEngine({
      0: { ...conditionBoard, hand: [{ card: "BT23-044", as: "lilamon" }] },
    });
    s.state.memory = 10;
    const lilamonId = s.inst("lilamon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: lilamonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === lilamonId));
    expect(s.state.memory).toBe(label === "neither" ? 3 : 6);
  });

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

  it("does not trash security after its carrier wins against a Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-046", as: "host", under: ["BT23-044"] }] },
      1: {
        security: [{ card: "BT23-041", as: "securityDigimon" }, { card: "BT1-010", as: "remaining" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security[0]!.instanceId).toBe(s.inst("remaining").instanceId);
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
              or: [
                {
                  kind: ["Tamer"],
                  nameOrTrait: [{ tokens: ["Yuuko Kamishiro"], match: "name" }],
                },
                {
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                },
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
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });

  it("digivolves for 3 from an off-color level-4 CS card and rejects a non-CS peer", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-041", as: "base" }], hand: [{ card: "BT23-044", as: "lilamon" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("lilamon").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-005", as: "base" }], hand: [{ card: "BT23-044", as: "lilamon" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("lilamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
