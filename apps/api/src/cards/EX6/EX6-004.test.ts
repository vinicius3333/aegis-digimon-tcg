import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-004.js";
import "./EX6-033.js";

describe("EX6-004 Kokomon", () => {
  it("inherits a once-per-turn effect-suspension trigger that gives one of your Digimon +2000 DP", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "ModifyDP",
              amount: 2000,
              duration: "forTheTurn",
              target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
            },
          ],
        },
      ],
    });
  });

  it("gains +2000 DP once when one of its controller's effects suspends a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-007", as: "host", under: ["EX6-004"] },
            { card: "BT1-009", as: "subject" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const before = s.perm("host").currentDP;

    await advance(s.engine).verb.suspend([s.perm("subject").permanentId], 0);
    expect(s.perm("subject").isSuspended).toBe(true);
    expect(s.perm("host").currentDP).toBe(before + 2000);
  });

  it("can give the bonus to any of its controller's Digimon, not only this host", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-007", as: "host", under: ["EX6-004"] },
            { card: "BT1-009", as: "subject" },
            { card: "BT1-009", as: "recipient" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("recipient").topCard!.instanceId);
    const hostBefore = s.perm("host").currentDP;
    const recipientBefore = s.perm("recipient").currentDP;

    await advance(s.engine).verb.suspend([s.perm("subject").permanentId], 0);

    expect(s.perm("recipient").currentDP).toBe(recipientBefore + 2000);
    expect(s.perm("host").currentDP).toBe(hostBefore);
  });

  it("checks the suspended Digimon's controller, not the effect controller", async () => {
    const oursSuspendedByOpponent = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-007", as: "host", under: ["EX6-004"] },
            { card: "BT1-009", as: "ours" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await oursSuspendedByOpponent.ready();
    const boostedHost = oursSuspendedByOpponent.perm("host").currentDP;

    await advance(oursSuspendedByOpponent.engine).verb.suspend([oursSuspendedByOpponent.perm("ours").permanentId], 1);

    expect(oursSuspendedByOpponent.perm("host").currentDP).toBe(boostedHost + 2000);

    const theirsSuspendedByUs = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-007", as: "host", under: ["EX6-004"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await theirsSuspendedByUs.ready();
    const unboostedHost = theirsSuspendedByUs.perm("host").currentDP;

    await advance(theirsSuspendedByUs.engine).verb.suspend([theirsSuspendedByUs.perm("opponent").permanentId], 0);

    expect(theirsSuspendedByUs.perm("host").currentDP).toBe(unboostedHost);
  });

  it("triggers from a public EX6-033 play and grants the bonus only once that turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-033", as: "firstTuruiemon" },
            { card: "EX6-033", as: "secondTuruiemon" },
          ],
          battleArea: [
            { card: "EX6-007", as: "host", under: ["EX6-004"] },
            { card: "BT1-009", as: "firstSubject" },
            { card: "BT1-009", as: "secondSubject" },
            { card: "BT1-009", as: "recipient" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const recipientBefore = s.perm("recipient").currentDP;
    const hostBefore = s.perm("host").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTuruiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const firstSuspension = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstSuspension.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("firstSubject").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const bonusTarget = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: bonusTarget.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("recipient").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstSubject").isSuspended && s.perm("recipient").currentDP === recipientBefore + 2000);
    expect(s.state.memory).toBe(5);
    expect(s.perm("recipient").currentDP).toBe(recipientBefore + 2000);
    expect(s.perm("host").currentDP).toBe(hostBefore);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTuruiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const secondSuspension = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondSuspension.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("secondSubject").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondSubject").isSuspended);
    expect(s.state.memory).toBe(0);
    expect(s.perm("recipient").currentDP).toBe(recipientBefore + 2000);
    expect(s.perm("host").currentDP).toBe(hostBefore);
  });
});
