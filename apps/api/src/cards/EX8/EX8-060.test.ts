import { describe, expect, it } from "vitest";
import "../BT1/BT1-020.js";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import "../EX12/EX12-032.js";
import { compiled } from "./EX8-060.js";

describe("EX8-060", () => {
  it("plays an NSo Digimon costing 3 or less from trash when attacking", () =>
    expect(
      compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { playCostLte: 3 } },
    }));
  it("DNA digivolves into NSo and may attack after an NSo is played or digivolves during your turn", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toHaveLength(2);
    expect(actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      actions: [{ kind: "DnaDigivolve" }, { kind: "Attack", optional: true }],
    });
    expect(actions[1]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
  });
  it("inherits a once-per-turn unsuspend by deleting another Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true }, count: 1 } },
        },
      ],
    }));
  it("exposes the level-4 NSo evolution route for cost 3", () =>
    expect(digivolutionRequirementsFor("EX8-060")).toContainEqual({
      level: 4,
      traits: ["NSo"],
      cost: 3,
      isAlternate: true,
    }));

  it("plays only an NSo Digimon at the exact cost-3 ceiling from trash when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-060", as: "source" }], trash: ["BT26-062", "BT26-071", "BT1-010"] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT26-062"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT26-071", "BT1-010"]),
    );
  });

  it("may refuse the attack-time trash play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-060", as: "source" }], trash: ["BT26-062"] },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT26-062");
  });

  it("may refuse the inherited delete-own cost and remains suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-020", as: "host", under: ["EX8-060"] },
            { card: "BT1-010", as: "other" },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(true);
  });

  it("may refuse the DNA evolution after its own play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "blueLevel5" }],
          hand: [
            { card: "EX8-060", as: "myotismon" },
            { card: "EX12-032", as: "dna" },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myotismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-040", "EX8-060"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX12-032");
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("may DNA digivolve but refuse the bound follow-up attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "blueLevel5" }],
          hand: [
            { card: "EX8-060", as: "myotismon" },
            { card: "EX12-032", as: "dna" },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myotismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const dnaPrompt = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dnaPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== dnaPrompt.decisionId,
    );
    const attackPrompt = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackPrompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX12-032")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("unsuspends only on the first attack after deleting exactly one other Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-020", as: "host", under: ["EX8-060"] },
            { card: "BT1-010", as: "otherA" },
            { card: "BT1-011", as: "otherB" },
          ],
        },
        1: { security: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const otherIds = [s.perm("otherA").topCard.instanceId, s.perm("otherB").topCard.instanceId];
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.filter((card) => otherIds.includes(card.instanceId))).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => otherIds.includes(card.instanceId))).toHaveLength(1);
  });

  it.each([
    ["its own play", "play"],
    ["its own evolution", "digivolve"],
  ])("triggers from %s, DNA digivolves into NSo, and attacks (Q3941-Q3942)", async (_label, route) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-040", as: "blueLevel5" },
            ...(route === "digivolve" ? [{ card: "EX8-059", as: "purpleLevel4" }] : []),
          ],
          hand: [
            { card: "EX8-060", as: "myotismon" },
            { card: "EX12-032", as: "dna" },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = route === "play" ? 7 : 3;
    await s.ready();

    const result =
      route === "play"
        ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myotismon").instanceId })
        : s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("purpleLevel4").permanentId,
            instanceId: s.inst("myotismon").instanceId,
            useAlternateCost: true,
          });
    expect(result).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    const dna = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX12-032");
    expect(dna).toBeDefined();
    expect(dna!.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-040", "EX8-060"]));
    expect(s.state.memory).toBe(0);
  });

  it("does not declare the follow-up attack when DNA occurs during an existing attack (Q3943)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-060", as: "myotismon" },
            { card: "BT1-040", as: "blueLevel5" },
          ],
          hand: [{ card: "EX12-032", as: "dna" }],
          trash: ["BT26-062"],
        },
        1: { security: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("myotismon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX12-032"));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("offers the DNA-produced attacker's simultaneous effects in a selectable order (Q3944)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "blueLevel5" }],
          hand: [
            { card: "EX8-060", as: "myotismon" },
            { card: "EX12-032", as: "dna" },
          ],
          trash: ["BT1-044"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "suspendTarget" }], security: ["BT1-010"] },
      },
      { autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myotismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const dnaPrompt = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dnaPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    s.putOnBoard(0, { card: "BT1-010", as: "other" });
    const attackPrompt = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const order = s.state.pendingDecision!;
    expect(order.kind).toBe("orderTriggers");
    const options = s.decisions.at(-1)!.req.options as { triggerCardIds?: string[]; triggerKeys?: string[] };
    expect(options.triggerCardIds).toEqual(["EX12-032", "EX12-032", "EX8-060"]);
    expect(options.triggerKeys).toHaveLength(3);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [options.triggerKeys![0]!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const remaining = s.state.pendingDecision!;
    expect(remaining.kind).toBe("orderTriggers");
    const remainingOptions = s.decisions.at(-1)!.req.options as {
      triggerCardIds?: string[];
      triggerKeys?: string[];
    };
    expect(remainingOptions.triggerCardIds).toEqual(["EX12-032", "EX8-060"]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: remaining.decisionId,
        response: { kind: "orderTriggers", order: [remainingOptions.triggerKeys![1]!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const inheritedPrompt = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: inheritedPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
  });
});
