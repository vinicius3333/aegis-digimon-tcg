import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./P-241.js";

describe("P-241 Yujin Ozora", () => {
  it("sets memory to three at the start of turn when memory is two or less", () => {
    expect(runtimeCompiledCard("P-241")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        actions: [
          { kind: "SetMemory", value: 3, condition: expect.objectContaining({ kind: "memoryAtMost", value: 2 }) },
        ],
      }),
    );
  });

  it("handles linking in one trigger: grants Appmon Vortex and DP, then permits App Fuse", () => {
    expect(runtimeCompiledCard("P-241")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenLinked",
            sourceFilter: { controller: "mine", kind: ["Digimon"] },
            actions: [
              expect.objectContaining({
                kind: "GainKeyword",
                duration: "forTheTurn",
                cost: expect.objectContaining({ kind: "suspend" }),
              }),
              expect.objectContaining({
                kind: "ModifyDP",
                amount: 3000,
                duration: "forTheTurn",
                target: expect.objectContaining({ sameTarget: true }),
              }),
              expect.objectContaining({ kind: "AppFuse", optional: true }),
            ],
          }),
        ],
      }),
    );
  });

  it("grants the Leviathan trait by Rule and plays from Security", () => {
    const effects = runtimeCompiledCard("P-241")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Rule",
        actions: [expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Leviathan"] })],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "PlayWithoutCost" })],
      }),
    );
  });
});

describe("P-241 engine behavior", () => {
  it("sets memory to exactly three at the start of a real turn from memory two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-241", as: "yujin" }],
          hand: ["BT1-009"],
          security: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          hand: ["BT1-009"],
          security: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    s.state.isFirstPlayersFirstTurn = false;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays itself without cost from Security during a real opponent attack", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "P-241", as: "yujin" }],
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker" }],
        deck: ["BT1-009"],
      },
    });
    const yujinId = s.inst("yujin").instanceId;
    s.state.turnSeat = 1;
    await s.ready();
    const memoryBeforeAttack = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === yujinId) &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === yujinId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBeforeAttack);
  });

  it("reacts to a real link by suspending, granting Vortex, and adding 3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-241", as: "yujin" },
            { card: "BT21-009", as: "host" },
          ],
          hand: [{ card: "BT21-047", as: "link" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("link").instanceId));
    const responses = [true, false];
    let previousDecisionId: string | undefined;
    for (const accept of responses) {
      if (previousDecisionId !== undefined) {
        await settle(
          () =>
            s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== previousDecisionId,
        );
      }
      const decision = s.state.pendingDecision;
      expect(decision?.kind).toBe("optional");
      if (decision === undefined || decision.kind !== "optional") {
        throw new Error("P-241 link flow did not expose the expected optional decision");
      }
      previousDecisionId = decision.decisionId;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
    }
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.instanceId === s.inst("link").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(4);
    expect(s.perm("yujin").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Vortex")).toBe(true);
    expect(s.perm("host").currentDP).toBe(baseDp + 5000);
  });

  it("accepts the linked-trigger App Fuse and merges a legal hand target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-241", as: "yujin" },
            { card: "BT21-043", as: "host" },
          ],
          hand: [
            { card: "BT21-070", as: "link" },
            { card: "BT21-073", as: "fusion" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    const hostPermanentId = s.perm("host").permanentId;
    const originalHostId = s.perm("host").topCard.instanceId;
    const linkId = s.inst("link").instanceId;
    const fusionId = s.inst("fusion").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const responses = [true, true, false];
    const expectedSources = ["P-241", "P-241", "BT21-073"];
    let previousDecisionId: string | undefined;
    for (const [index, accept] of responses.entries()) {
      if (previousDecisionId !== undefined) {
        await settle(
          () =>
            s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== previousDecisionId,
        );
      }
      const decision = s.state.pendingDecision;
      expect(decision?.kind).toBe("optional");
      if (decision === undefined || decision.kind !== "optional") {
        throw new Error("P-241 App Fuse flow did not expose the expected optional decision");
      }
      expect(s.decisions[s.decisions.length - 1]?.req.sourceCardId).toBe(expectedSources[index]);
      previousDecisionId = decision.decisionId;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
    }
    await settle(
      () => s.perm("host").topCard.instanceId === s.inst("fusion").instanceId && s.state.pendingDecision === undefined,
    );

    expect(s.perm("host").permanentId).toBe(hostPermanentId);
    expect(s.perm("host").topCard.cardId).toBe("BT21-073");
    expect(s.perm("host").topCard.instanceId).toBe(fusionId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([originalHostId, linkId]);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("fusion").instanceId)).toBe(false);
  });
});
