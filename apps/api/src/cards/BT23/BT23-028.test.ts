import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-028.js";

describe("BT23-028 Coordemon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-028")).toMatchObject({
      cardId: "BT23-028",
      nameEn: "Coordemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Sup.", "Appmon"],
      attributes: ["Entertainment"],
      types: ["Coordinate"],
      linkDp: 3000,
      linkEffect:
        "[When Linking] Until your opponent's turn ends, 1 of their Digimon can't activate [When Digivolving] effects.",
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 2",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
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

  it("rejects Link onto a non-Appmon without spending memory or moving Coordemon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host" }], hand: [{ card: "BT23-028", as: "coordemon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("coordemon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("coordemon").instanceId);
  });
});
