import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-029.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-029", () => {
  it("has Blast Digivolve from hand and reduces two suspended opposing Digimon by 8000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({
      keyword: "BlastDigivolve",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      const modifyDp = actions.filter((action) => action.kind === "ModifyDP");
      expect(modifyDp).toHaveLength(1);
      expect(modifyDp[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -8000,
        duration: "untilYourTurnEnd",
        target: { count: 2, filter: { suspended: true } },
      });
    }
  });
  it("suspends an opposing Digimon and unsuspends itself when no opposing Digimon remain unsuspended", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions).toMatchObject([
      { kind: "Suspend" },
      { kind: "Unsuspend", condition: { kind: "opponentHasNone" } },
    ]));

  it("reduces two distinct suspended opposing Digimon by 8000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-029", as: "saber" }] },
        1: {
          battleArea: [
            { card: "EX7-014", as: "first", suspended: true, dp: 12000 },
            { card: "EX7-014", as: "second", suspended: true, dp: 13000 },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(s.perm("first").permanentId).not.toBe(s.perm("second").permanentId);
    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("saber"));
    await resolution;
    await settle(
      () =>
        s.state.players[1]!.battleArea[0]!.currentDP === 4000 && s.state.players[1]!.battleArea[1]!.currentDP === 5000,
    );
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(4000);
    expect(s.state.players[1]!.battleArea[1]!.currentDP).toBe(5000);
  });

  it("reduces two distinct suspended opposing Digimon by 8000 DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-029", as: "saber" }] },
        1: {
          battleArea: [
            { card: "EX7-014", as: "first", suspended: true, dp: 12000 },
            { card: "EX7-014", as: "second", suspended: true, dp: 13000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("first").permanentId).not.toBe(s.perm("second").permanentId);
    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("saber"));
    await resolution;
    await settle(
      () =>
        s.state.players[1]!.battleArea[0]!.currentDP === 4000 && s.state.players[1]!.battleArea[1]!.currentDP === 5000,
    );
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(4000);
    expect(s.state.players[1]!.battleArea[1]!.currentDP).toBe(5000);
  });

  it("Blast Digivolves from hand onto an NSp level 5 Digimon without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
        1: {
          battleArea: [{ card: "EX7-035", as: "base" }],
          hand: [{ card: "EX7-029", as: "saber" }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("saber").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-029");

    expect(s.perm("base").topCard?.cardId).toBe("EX7-029");
    expect(s.state.memory).toBe(0);
  });

  it("suspends the only opposing Digimon and unsuspends itself when attacking it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-029", as: "saber", dp: 7000 }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("saber").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("saber").isSuspended && s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("saber").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
