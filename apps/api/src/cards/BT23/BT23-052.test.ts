import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-052.js";

describe("BT23-052 Consulmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-052")).toMatchObject({
      cardId: "BT23-052",
      nameEn: "Consulmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Sup.", "Appmon"],
      attributes: ["Life"],
      types: ["Saving"],
      linkDp: 3000,
    });
    expect(compiled.linkRequirement).toEqual([{ cost: 2, traits: ["Appmon"] }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("waits for its security battle to end, then plays itself without cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-057", as: "attacker" }] },
        1: { security: [{ card: "BT23-052", as: "securityConsul" }] },
      },
      { autoSelectCards: true },
    );
    const consulId = s.inst("securityConsul").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === consulId));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === consulId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === consulId)).toBe(true);
  });

  it("links to an Appmon for cost 2, adds 3000 DP, and grants Reboot and Blocker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT23-052", as: "consul" }],
      },
    });
    s.state.memory = 5;
    const hostId = s.perm("host").permanentId;
    const baseDp = s.perm("host").currentDP;
    const consulId = s.inst("consul").instanceId;

    expect(s.engine.applyIntent(0, { type: "linkCard", instanceId: consulId, targetPermanentId: hostId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.instanceId === consulId) &&
        observe(s.engine).hasKeyword(s.perm("host"), "Reboot") &&
        observe(s.engine).hasKeyword(s.perm("host"), "Blocker"),
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("plays itself without cost at the end of the battle when revealed from security", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Security") as any;
    expect(effect).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, isSelf: true },
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
    });
  });

  it("restricts one opposing Digimon from attacking players until the opponent's turn ends", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Restrict",
        restriction: "attackPlayers",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("prevents the selected opponent from attacking a player while preserving Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-052", as: "consul" },
            { card: "BT1-009", as: "defender", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("consul"));
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("carries its Appmon link requirement and linked When Linking grants", () => {
    expect(compiled.linkRequirement).toEqual([{ cost: 2, traits: ["Appmon"] }]);
    expect(compiled.effects.find((entry) => entry.isLinked)).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          actions: [
            { kind: "GainKeyword", keyword: { keyword: "Reboot" }, duration: "untilOpponentTurnEnd" },
            { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
          ],
        },
      ],
    });
  });
});
