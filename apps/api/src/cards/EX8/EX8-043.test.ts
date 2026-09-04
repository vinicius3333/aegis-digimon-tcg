import { describe, expect, it } from "vitest";
import { EffectTiming, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-043.js";

describe("EX8-043", () => {
  it("may suspend either player's Digimon, then de-digivolves an opposing Digimon if this Digimon is suspended", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Suspend", optional: true });
    expect(actions[1]).toMatchObject({ kind: "DeDigivolve", amount: 1, condition: { kind: "selfIsSuspended" } });
  });
  it("protects itself from opponent returns and de-digivolution while suspended", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[2]).toMatchObject({
      kind: "Restrict",
      restriction: "beReturned",
      byOpponentEffectsOnly: true,
      duration: "untilOpponentTurnEnd",
    });
    expect(actions[3]).toMatchObject({
      kind: "Restrict",
      restriction: "cantBeDeDigivolved",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
        },
      ],
    });
  });

  it("suspends a legal Digimon through On Play and resolves the optional effect", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-043", as: "metal" }] },
        1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("opponent").permanentId);
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        player.battleArea.some((p) => p.topCard?.cardId === "EX8-043") &&
        s.state.players[1]!.battleArea[0]?.isSuspended === true,
    );

    expect(s.state.players[1]!.battleArea[0]?.isSuspended).toBe(true);
  });

  it("does not de-digivolve or protect itself when the optional suspension is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-043", as: "metal" }] },
        1: { battleArea: [{ card: "AD1-001", as: "opponent", under: ["BT1-009"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX8-043"));
    expect(s.perm("opponent").topCard?.cardId).toBe("AD1-001");
    expect(observe(s.engine).isRestricted(s.perm("metal"), "beReturned")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("metal"), "cantBeDeDigivolved")).toBe(false);
  });
  it("trashes the opponent's top security when its host deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-081", as: "attacker", dp: 10000, under: ["EX8-043"] }] },
      1: {
        battleArea: [{ card: "BT1-016", as: "defender", dp: 1000, suspended: true }],
        security: [{ card: "BT1-010", as: "top" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
  });

  it("de-digivolves and protects itself when already suspended at entry resolution", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-043", as: "metal", suspended: true }] },
        1: { battleArea: [{ card: "AD1-001", as: "target", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").permanentId);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("metal"));
    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    expect(observe(s.engine).isRestricted(s.perm("metal"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("metal"), "cantBeDeDigivolved")).toBe(true);
  });

  it("does not trash security when both battlers are deleted (Q3929)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-081", as: "attacker", dp: 3000, under: ["EX8-043"] }] },
      1: {
        battleArea: [{ card: "BT1-016", as: "defender", dp: 3000, suspended: true }],
        security: [{ card: "BT1-010", as: "top" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
