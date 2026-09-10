import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-004.js";

describe("EX8-004", () => {
  it("matches the catalog's Digi-Egg identity and inherited text", () =>
    expect(getCardDefinition("EX8-004")).toMatchObject({
      cardId: "EX8-004",
      nameEn: "Motimon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser", "NSp"],
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When any of your other [NSp]\u00a0trait Digimon are played, if this Digimon has the [NSp]\u00a0trait, this Digimon may attack.",
      evoCosts: [],
    }));

  it("inherits a once-per-turn optional attack when another NSp Digimon is played", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
          },
          actions: [
            {
              kind: "Attack",
              optional: true,
              withoutSuspending: false,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              condition: {
                kind: "selfHasTrait",
                filter: { nameOrTrait: [{ tokens: ["NSp"], match: "trait" }] },
              },
            },
          ],
        },
      ],
    }));
  it("requires the played card to be another friendly NSp Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      sourceFilter: {
        controller: "mine",
        excludeSelf: true,
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
      },
    }));

  it("attacks after another friendly NSp Digimon is played only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX8-039", as: "played1" },
            { card: "EX8-039", as: "played2" },
          ],
          battleArea: [{ card: "EX8-039", as: "host", under: ["EX8-004"], dp: 20_000 }],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended && !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("may refuse the attack without suspending or checking security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-039", as: "played" }],
          battleArea: [{ card: "EX8-039", as: "host", under: ["EX8-004"] }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not attack for a non-NSp play or from a non-NSp host", async () => {
    for (const [host, played] of [
      ["EX8-039", "BT1-045"],
      ["BT1-045", "EX8-039"],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: played, as: "played" }],
            battleArea: [{ card: host, as: "host", under: ["EX8-004"] }],
          },
          1: { security: ["BT1-009"] },
        },
        { autoAcceptOptional: true },
      );
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.length === 2);
      expect(s.perm("host").isSuspended).toBe(false);
      expect(s.state.players[1]!.security).toHaveLength(1);
    }
  });

  it("resets its once-per-turn trigger on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX8-039", as: "played1" },
            { card: "EX8-039", as: "played2" },
          ],
          battleArea: [{ card: "EX8-039", as: "host", under: ["EX8-004"], dp: 20_000 }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
