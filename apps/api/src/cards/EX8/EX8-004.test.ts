import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-004.js";

describe("EX8-004", () => {
  it("inherits a once-per-turn optional attack when another NSp Digimon is played", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: [{ kind: "Attack", optional: true, withoutSuspending: false, condition: { kind: "selfHasTrait" } }],
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
          battleArea: [{ card: "EX8-039", as: "host", under: ["EX8-004"] }],
        },
        1: { security: ["EX8-004", "EX8-004"] },
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
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("may refuse the attack without suspending or checking security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-039", as: "played" }],
          battleArea: [{ card: "EX8-039", as: "host", under: ["EX8-004"] }],
        },
        1: { security: ["EX8-004"] },
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
          1: { security: ["EX8-004"] },
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
});
