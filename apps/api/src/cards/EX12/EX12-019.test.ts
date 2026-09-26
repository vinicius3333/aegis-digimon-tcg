import { describe, expect, it } from "vitest";
import { EffectDuration, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";
import "../BT10/BT10-087.js";
import "../BT16/BT16-042.js";

describe("EX12-019 Nezhamon", () => {
  it("gains Digimon-source immunity and +4000 when an attack target switches, once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-019", as: "source", dp: 12000 },
          { card: "BT1-009", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });
    expect(s.perm("source").currentDP).toBe(16000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Option")).toBe(false);

    const sourceId = s.perm("source").permanentId;
    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(sourceId, 1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("source").currentDP).toBe(17000);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(sourceId, -1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("source").currentDP).toBe(17000);

    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    await advance(s.engine).verb.modifyDP(sourceId, -1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("source").currentDP).toBe(16000);

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });
    expect(s.perm("source").currentDP).toBe(16000);
  });

  it("allows a real friendly Digimon effect while blocking opposing Digimon effects", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-019", as: "source", dp: 12000 },
            { card: "BT1-009", as: "other" },
          ],
          hand: [{ card: "BT16-042", as: "blade" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("source").topCard!.instanceId);
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });
    expect(s.perm("source").currentDP).toBe(16000);

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blade").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("source").currentDP === 19000);
    expect(s.perm("source").currentDP).toBe(19000);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(s.perm("source").permanentId, -1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("source").currentDP).toBe(19000);
  });

  it("unsuspends itself when its controller's security is removed, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-019", as: "source", suspended: true }],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker", dp: 5000 },
            { card: "BT1-009", as: "secondAttacker", dp: 5000 },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1 && !s.perm("source").isSuspended);
    expect(s.perm("source").isSuspended).toBe(false);

    s.perm("source").isSuspended = true;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.perm("source").isSuspended).toBe(true);
  });

  it("also unsuspends for an opponent security removal because either security stack qualifies", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-019", as: "source", suspended: true }], security: ["BT1-009"] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("source").isSuspended).toBe(false);
  });

  it("unsuspends through an actual security check that removes the opponent's top security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-019", as: "source", suspended: true },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: { security: ["BT1-090"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !s.perm("source").isSuspended);

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-090");
    expect(s.perm("source").isSuspended).toBe(false);
  });

  it("resolves the checked card's Security effect before Nezhamon's security-removal watcher (Q6750)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-019", as: "source", suspended: true },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: {
          security: ["BT10-087"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").isSuspended === false && s.state.pendingDecision === undefined);

    const order = s.events
      .filter((event) => event.kind === "effectTriggered")
      .map((event) => `${event.sourceCardId}/${event.timing}`);
    const resolvedOrder = s.events
      .filter((event) => event.kind === "effectResolved")
      .map((event) => `${event.sourceCardId}/${event.timing}`);
    expect(order).toContain("BT10-087/Security");
    expect(order).toContain("BT10-087/OnPlay");
    expect(order).toContain("EX12-019/whenSecurityRemoved");
    expect(order.indexOf("BT10-087/Security")).toBeLessThan(order.indexOf("BT10-087/OnPlay"));
    expect(order.indexOf("BT10-087/OnPlay")).toBeLessThan(order.indexOf("EX12-019/whenSecurityRemoved"));
    expect(resolvedOrder).toContain("BT10-087/Security");
    expect(resolvedOrder).toContain("BT10-087/OnPlay");
    expect(resolvedOrder).toContain("EX12-019/whenSecurityRemoved");
    expect(resolvedOrder.indexOf("BT10-087/Security")).toBeLessThan(
      resolvedOrder.indexOf("EX12-019/whenSecurityRemoved"),
    );
    expect(resolvedOrder.indexOf("BT10-087/OnPlay")).toBeLessThan(
      resolvedOrder.indexOf("EX12-019/whenSecurityRemoved"),
    );
  });

  it("encodes Engage as an optional end-of-turn self-attack", () => {
    const compiled = registeredCompiledCards.get("EX12-019")!;
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true }],
    });
  });

  it("has Rush, Collision, Piercing, Blocker, and Engage as live keywords", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-019", as: "source" }] } });
    await s.ready();

    for (const keyword of ["Rush", "Collision", "Blocker", "Engage"]) {
      expect(observe(s.engine).hasKeyword(s.perm("source"), keyword)).toBe(true);
    }
    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);
  });

  it("can attack on the turn it is played through Rush", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX12-019", as: "source" }] },
      1: { security: ["BT1-090"] },
    });
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-019"));
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-019")!;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: played.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("uses Engage for its optional end-of-turn attack through the public turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-019", as: "source" }],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
        1: {
          security: ["BT1-009", "BT1-009"],
          deck: Array.from({ length: 8 }, () => "BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    await advance(s.engine).runTurn(0);

    expect(
      s.events.some(
        (event) => event.kind === "attackDeclared" && event.attackerPermanentId === s.perm("source").permanentId,
      ),
    ).toBe(true);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("forces a Collision block, gains +4000 on the switch, and Pierces after winning", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-019", as: "source" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "blocker", dp: 1000 }],
        security: ["BT1-090"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks(500);

    expect(s.perm("source").currentDP).toBe(16000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("encodes all printed keywords, evolution, and both shared Once Per Turn watchers", () => {
    const compiled = registeredCompiledCards.get("EX12-019")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["Shambala"], cost: 3, isAlternate: true }]);
    const staticKeywords = compiled.effects
      .flatMap((effect) => effect.keywords ?? [])
      .map((keyword) => keyword.keyword);
    expect(staticKeywords).toEqual(["Engage"]);
    const sourceKeywords = compiled.effects
      .filter((effect) => effect.trigger === "Static")
      .flatMap((effect) => effect.actions ?? [])
      .filter((action) => action.kind === "GainKeyword")
      .map((action) => action.keyword.keyword);
    expect(sourceKeywords).toEqual(["Rush", "Collision", "Piercing", "Blocker"]);
    expect(compiled.effects.filter((effect) => effect.trigger === "AllTurns")).toHaveLength(2);
    const switched = compiled.effects.find((effect) =>
      effect.actions?.some((action) => action.kind === "SubTrigger" && action.event === "whenAttackTargetSwitched"),
    )!;
    expect(switched).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "Restrict",
              restriction: "beAffected",
              fromSourceKind: ["Digimon"],
              byOpponentEffectsOnly: true,
              duration: "untilOpponentTurnEnd",
            },
            { kind: "ModifyDP", amount: 4000, duration: "untilOpponentTurnEnd" },
          ],
        },
      ],
    });
    const security = compiled.effects.find((effect) =>
      effect.actions?.some((action) => action.kind === "SubTrigger" && action.event === "whenSecurityRemoved"),
    )!;
    expect(security).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          actions: [{ kind: "Unsuspend", optional: true, target: { filter: { isSelfRef: true }, isSelf: true } }],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("uses both normal colors and the cost-3 Shambala evolution alternative", async () => {
    expect(digivolutionRequirementsFor("EX12-019")).toEqual([
      { level: 5, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);
    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["AD1-003", false, 4],
      ["BT10-064", false, 4],
      ["EX12-029", true, 3],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-019", as: "nezhamon" }],
        },
      });
      s.state.memory = startingMemory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("nezhamon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-019");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-5 card without Shambala", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "base" }],
        hand: [{ card: "EX12-019", as: "nezhamon" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("nezhamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
