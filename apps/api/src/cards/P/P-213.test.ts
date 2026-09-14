import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-213.js";
import "./P-194.js";
import "../BT24/BT24-083.js";
import "../BT24/BT24-031.js";

describe("P-213 Aegiochusmon", () => {
  it("has Raid, Decode, and the Aegiomon digivolution requirement", () => {
    const card = runtimeCompiledCard("P-213")!;
    expect(card.digivolutionRequirement).toEqual([{ names: ["Aegiomon"], cost: 3, isAlternate: true }]);
    expect(card.effects.filter((effect) => effect.trigger === "Static").map((effect) => effect.keywords)).toEqual([
      [{ keyword: "Raid", raw: "＜Raid＞" }],
      [{ keyword: "Decode", raw: "＜Decode ([Aegiomon])＞" }],
      [{ keyword: "Decode", raw: "＜Decode ([Aegiomon])＞" }],
    ]);
    const decodeEffects = card.effects.filter((effect) => effect.trigger === "AllTurns");
    expect(decodeEffects).toHaveLength(2);
    expect(decodeEffects[0]).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          sourceFilter: { isSelfRef: true },
          leaveCause: "otherThanBattle",
          actions: [
            {
              kind: "PlayWithoutCost",
              fromOwnDigivolutionStack: true,
              payCost: false,
              playedByDecode: true,
              optional: true,
              target: {
                filter: {
                  nameOrTrait: [{ tokens: ["Aegiomon"], match: "nameExact" }],
                },
              },
            },
          ],
        },
      ],
    });
    expect(decodeEffects[1]).toMatchObject({ isInherited: true });
  });

  it("gains Rush and 3000 DP at three or fewer security, then may attack", () => {
    expect(runtimeCompiledCard("P-213")!.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "untilOpponentTurnEnd",
          target: { count: 1, isSelf: true },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
        },
        {
          kind: "ModifyDP",
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          target: { count: 1, isSelf: true },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
        },
        { kind: "Attack", optional: true, withoutSuspending: false, target: { count: 1, isSelf: true } },
      ],
    });
  });
});

describe("P-213 Decode", () => {
  it("plays the original Aegiomon from the public digivolution stack before P-213 leaves", async () => {
    const s = setupEngine(
      {
        0: {
          security: 4,
          battleArea: [{ card: "P-194", as: "host" }],
          hand: [{ card: "P-213", as: "aegiochusmon" }],
          deck: Array(20).fill("BT1-009"),
        },
        1: { security: ["BT1-009"], deck: Array(20).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostPermanentId = s.perm("host").permanentId;
    const originalAegiomonId = s.inst("host").instanceId;
    const p213Id = s.inst("aegiochusmon").instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostPermanentId,
        instanceId: p213Id,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === p213Id && !observe(s.engine).isAttacking());

    const memoryBeforeLeave = s.state.memory;
    expect(await advance(s.engine).verb.deletePermanent([hostPermanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === originalAegiomonId),
    );

    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === originalAegiomonId,
    )!;
    expect(played.permanentId).not.toBe(hostPermanentId);
    expect(played.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(p213Id);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(originalAegiomonId);
    expect(s.state.memory).toBe(memoryBeforeLeave);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("plays Aegiomon through inherited Decode on a neutral Yellow level-6 stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-063",
              as: "host",
              under: [
                { card: "P-194", as: "aegiomonSource" },
                { card: "P-213", as: "p213Source" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostPermanentId = s.perm("host").permanentId;
    const hostId = s.inst("host").instanceId;
    const aegiomonId = s.inst("aegiomonSource").instanceId;
    const p213Id = s.inst("p213Source").instanceId;
    const memoryBeforeLeave = s.state.memory;

    expect(await advance(s.engine).verb.deletePermanent([hostPermanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === aegiomonId),
    );

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === aegiomonId)!;
    expect(played.stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(hostPermanentId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([hostId, p213Id]));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(aegiomonId);
    expect(s.state.memory).toBe(memoryBeforeLeave);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("does not Decode when the inherited host leaves through battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-063",
              as: "host",
              under: [
                { card: "P-194", as: "aegiomonSource" },
                { card: "P-213", as: "p213Source" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostPermanentId = s.perm("host").permanentId;
    const sourceIds = [s.inst("host").instanceId, s.inst("aegiomonSource").instanceId, s.inst("p213Source").instanceId];

    expect(await advance(s.engine).verb.deletePermanent([hostPermanentId], "byBattle")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceIds));
  });

  it("may decline inherited Decode and then trashes the host stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-063",
              as: "host",
              under: [
                { card: "P-194", as: "aegiomonSource" },
                { card: "P-213", as: "p213Source" },
              ],
            },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const hostPermanentId = s.perm("host").permanentId;
    const sourceIds = [s.inst("host").instanceId, s.inst("aegiomonSource").instanceId, s.inst("p213Source").instanceId];

    expect(await advance(s.engine).verb.deletePermanent([hostPermanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceIds));
    expect(observe(s.engine).isAttacking()).toBe(false);
  });
});
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-213 engine behavior", () => {
  it("resolves inherited When Attacking before revealing security during its digivolution attack", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT1-009", as: "ownSecurity" }],
          battleArea: [{ card: "P-194", as: "host", under: ["BT24-031"] }],
          hand: [{ card: "P-213", as: "evolution" }],
          deck: Array(20).fill("BT1-009"),
        },
        1: { security: ["BT1-009"], deck: Array(20).fill("BT1-009") },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "P-213"));
    const attackPrompt = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "P-213")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT24-031"));
    const inheritedPrompt = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.sourceCardId === "BT24-031",
    )!.req;
    expect(s.state.pendingDecision?.decisionId).toBe(inheritedPrompt.decisionId);
    expect(s.events.some((event) => event.kind === "securityRevealed")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: inheritedPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "P-213"));
    const inheritedResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "BT24-031",
    );
    const securityRevealed = s.events.findIndex((event) => event.kind === "securityRevealed");
    expect(inheritedResolved).toBeGreaterThanOrEqual(0);
    expect(securityRevealed).toBeGreaterThan(inheritedResolved);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ownSecurity").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it.each([5, 4, 3])(
    "respects same-turn attack legality after Hiroko plays Aegiomon with %i security",
    async (security) => {
      const s = setupEngine(
        {
          0: {
            security,
            battleArea: [{ card: "BT24-083", as: "hiroko" }],
            hand: [
              { card: "P-194", as: "aegiomon" },
              { card: "P-213", as: "evolution" },
            ],
            deck: Array(20).fill("BT1-009"),
          },
          1: { security: ["BT1-009"], deck: Array(20).fill("BT1-009") },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
      );
      s.state.memory = 3;
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      const host = s.state.players[0]!.battleArea.find(
        (permanent) => permanent.topCard.instanceId === s.inst("aegiomon").instanceId,
      )!;
      expect(host).toBeDefined();
      expect(host.enterFieldTurnCount).toBe(s.state.turnCount);
      const enteredTurn = host.enterFieldTurnCount;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: host.permanentId,
          instanceId: s.inst("evolution").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "P-213"));

      const attacks = s.events.filter((event) => event.kind === "attackDeclared");
      const remainingSecurity = s.state.players[1]!.security.length;
      const attackDP = host.currentDP;
      const suspended = host.isSuspended;
      expect(host.enterFieldTurnCount).toBe(enteredTurn);
      expect(host.topCard.instanceId).toBe(s.inst("evolution").instanceId);
      expect(host.stack.map((card) => card.instanceId)).toContain(s.inst("aegiomon").instanceId);
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;

      const gainsRush = security <= 3;
      expect(attacks).toHaveLength(gainsRush ? 1 : 0);
      expect(remainingSecurity).toBe(gainsRush ? 0 : 1);
      expect(attackDP).toBe(gainsRush ? 10000 : 7000);
      expect(suspended).toBe(gainsRush);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(observe(s.engine).isAttacking()).toBe(false);
    },
  );

  it("grants Rush and +3000 DP at three security, but not at four", async () => {
    const s = setupEngine(
      {
        0: {
          security: 3,
          battleArea: [{ card: "P-194", as: "host" }],
          hand: [{ card: "P-213", as: "aegiomon" }],
          deck: Array(20).fill("BT1-009"),
        },
        1: { deck: Array(20).fill("BT1-009") },
      },
      { autoDeclineOptional: true },
    );
    const hostPermanentId = s.perm("host").permanentId;
    const sourceInstanceId = s.inst("host").instanceId;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostPermanentId,
        instanceId: s.inst("aegiomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("aegiomon").instanceId);
    expect(s.perm("host").currentDP).toBe(10000);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 5, to: 2, reason: "digivolve" });
    expect(s.perm("host").permanentId).toBe(hostPermanentId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    const high = setupEngine(
      {
        0: {
          security: 4,
          battleArea: [{ card: "P-194", as: "host" }],
          hand: [{ card: "P-213", as: "aegiomon" }],
          deck: Array(20).fill("BT1-009"),
        },
        1: { deck: Array(20).fill("BT1-009") },
      },
      { autoDeclineOptional: true },
    );
    const highHostPermanentId = high.perm("host").permanentId;
    const highSourceInstanceId = high.inst("host").instanceId;
    high.state.memory = 5;
    await high.ready();
    expect(
      high.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: highHostPermanentId,
        instanceId: high.inst("aegiomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => high.perm("host").topCard.instanceId === high.inst("aegiomon").instanceId);
    expect(high.perm("host").currentDP).toBe(7000);
    expect(high.events).toContainEqual({ kind: "memoryChanged", from: 5, to: 2, reason: "digivolve" });
    expect(high.perm("host").permanentId).toBe(highHostPermanentId);
    expect(high.perm("host").stack.map((card) => card.instanceId)).toEqual([highSourceInstanceId]);
  });

  it("still permits the optional attack when the three-security bonus condition is false", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-194", as: "host" }],
          hand: [{ card: "P-213", as: "aegiomon" }],
          security: 4,
          deck: Array(20).fill("BT1-009"),
        },
        1: { security: ["BT1-009"], deck: Array(20).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostPermanentId = s.perm("host").permanentId;
    const sourceInstanceId = s.inst("host").instanceId;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostPermanentId,
        instanceId: s.inst("aegiomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("aegiomon").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 5, to: 2, reason: "digivolve" });
    expect(s.perm("host").permanentId).toBe(hostPermanentId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
  });
});
