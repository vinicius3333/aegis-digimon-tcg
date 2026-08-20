import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-028.js";

describe("BT23-028 Coordemon", () => {
  it("waits for its security battle to end, plays itself and applies its On Play DP loss", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-024", as: "target" },
            { card: "BT23-057", as: "attacker" },
          ],
        },
        1: {
          security: [{ card: "BT23-028", as: "securityCoordemon" }],
        },
      },
      { autoSelectCards: true },
    );
    const coordemonId = s.inst("securityCoordemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((card) => card.topCard?.instanceId === coordemonId) &&
        s.perm("target").currentDP === 7000,
    );

    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === coordemonId)).toBe(false);
  });

  it("links for 2, contributes 3000 DP and restricts an opposing Digimon when linking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT23-028", as: "linker" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const linkerId = s.inst("linker").instanceId;
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkerId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));

    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(baseDp + 3000);
  });

  it("plays itself at the end of the battle when revealed from security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security") as any;
    expect(security).toMatchObject({
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
    });
  });

  it("reduces one opposing Digimon by 3000 on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: -3000,
        duration: "forTheTurn",
      });
    }
  });

  it("carries the Appmon link requirement and linked timing restriction", () => {
    expect(compiled.linkRequirement).toEqual([{ cost: 2, traits: ["Appmon"] }]);
    expect(compiled.effects.find((entry) => entry.isLinked)).toMatchObject({
      trigger: "AllTurns",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Restrict",
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    });
  });
});
