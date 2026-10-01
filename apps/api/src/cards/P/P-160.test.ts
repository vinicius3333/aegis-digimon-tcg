import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-160.js";
import "../BT8/BT8-016.js";
import "./P-113.js";
import "../EX8/EX8-014.js";
import "../EX8/EX8-065.js";

describe("P-160 Tyrannomon (X Antibody)", () => {
  it("requires non-X-Antibody Tyrannomon for zero-cost digivolution", () => {
    expect(runtimeCompiledCard("P-160")!.digivolutionRequirement).toEqual([
      { level: 4, names: ["Tyrannomon"], excludeTraits: ["X Antibody"], cost: 0, isAlternate: true },
    ]);
  });

  it("checks Tyrannomon name or an exact X Antibody card in the stack for its attack digivolution", () => {
    const attack = runtimeCompiledCard("P-160")!.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    expect(attack).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          optional: true,
          reduceCost: 1,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: expect.arrayContaining([
                { tokens: ["Tyrannomon"], match: "name" },
                { tokens: ["X Antibody"], match: "nameExact" },
              ]),
            },
          },
          into: {
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Tyrannomon"], match: "name" },
              { tokens: ["Dinosaur"], match: "trait" },
            ],
          },
        },
      ],
    });
  });

  it("exposes Raid on the played Tyrannomon X Antibody", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-160", as: "host" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
  });

  it("publicly digivolves while attacking, pays the reduced cost, and carries Piercing into battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-016", as: "host" }],
          hand: [
            { card: "P-160", as: "p160" },
            { card: "BT8-016", as: "target" },
          ],
          deck: Array(20).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 2000 }],
          deck: Array(20).fill("BT1-009"),
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const hostPermanentId = s.perm("host").permanentId;
    const sourceInstanceId = s.inst("host").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostPermanentId,
        instanceId: s.inst("p160").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "P-160");
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("p160").instanceId);
    expect(s.perm("host").permanentId).toBe(hostPermanentId);
    expect(s.state.memory).toBe(5);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostPermanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT8-016");
    expect(s.perm("host").topCard.cardId).toBe("BT8-016");
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 5, to: 2, reason: "digivolve" });
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId, s.inst("p160").instanceId]);

    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.security.length === 0 &&
        s.events.some((event) => event.kind === "combatResolved" && event.attackerPermanentId === hostPermanentId) &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not use the attack digivolution when the stack only has an X Antibody trait card with a different name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-008", as: "host" }],
          hand: [
            { card: "P-160", as: "p160" },
            { card: "BT8-016", as: "target" },
          ],
          deck: Array(20).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 2000 }],
          deck: Array(20).fill("BT1-009"),
          security: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("p160").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "P-160");
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 3, to: 0, reason: "digivolve" });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.events.some(
          (event) => event.kind === "combatResolved" && event.attackerPermanentId === s.perm("host").permanentId,
        ) &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("p160").instanceId);
    expect(s.perm("host").topCard.cardId).toBe("P-160");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("P-160 Tyrannomon (X Antibody) — KB Q&A rulings", () => {
  it("lets the player order its simultaneous <Raid> and [When Attacking] triggers (Q4273)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-160", as: "attacker", under: ["BT1-016"] }],
          hand: [{ card: "EX8-014", as: "master" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "raidTarget", dp: 12000 }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, declinePrompts: ["Suspend 1 target"] },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());

    const order = s.decisions.find(({ req }) => req.kind === "orderTriggers");
    expect(order?.seat).toBe(0);
    expect(order?.req.options?.triggerDescriptions).toEqual([
      expect.stringContaining("[When Attacking]"),
      expect.stringContaining("＜Raid＞"),
    ]);
    expect(s.perm("attacker").topCard.cardId).toBe("EX8-014");
  });

  it("can't activate its pending <Raid> or [When Attacking] after EX8-065 digivolves it away (Q4274)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-160", as: "attacker", under: ["BT1-016"] },
            { card: "EX8-065", as: "tamer" },
          ],
          hand: [
            { card: "EX8-014", as: "master" },
            { card: "P-113", as: "rust" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "raidTarget", dp: 12000 }], security: ["BT1-009"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds,
        preferTriggerKeys: ["subtrigger"],
        declinePrompts: ["Suspend 1 target"],
      },
    );
    preferInstanceIds.push(s.inst("master").instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("attacker").topCard.cardId).toBe("EX8-014");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("rust").instanceId]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("raidTarget").permanentId,
    ]);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "P-160")).toBe(false);
  });
});
