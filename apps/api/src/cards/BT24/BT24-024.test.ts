import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-024.js";
import "../index.js";

describe("BT24-024 Submarimon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-024")).toMatchObject({
      cardId: "BT24-024",
      nameEn: "Submarimon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Armor Form"],
      attributes: ["Free"],
      types: ["Aquatic", "Iliad", "TS"],
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
    });
  });

  it("plays a TS Tamer from hand with a once-per-turn cost reduction", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostBy: 2,
      optional: true,
    });
    expect(effect.actions[0].target.filter).toMatchObject({
      kind: ["Tamer"],
      nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
    });
  });

  it("retains Armor Purge and both alternate digivolution requirements", () => {
    expect(compiled.effects[0]?.keywords?.[0]?.keyword).toBe("Armor Purge");
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Armadillomon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
    ]);
  });

  it("plays a TS Tamer for its play cost reduced by 2, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-024", as: "submarimon" }],
          hand: [
            { card: "BT24-084", as: "firstTamer" },
            { card: "BT24-088", as: "secondTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("submarimon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-084"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("submarimon"));

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("firstTamer").instanceId,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondTamer").instanceId);
  });

  it("may decline the reduced-cost Tamer play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-024", as: "submarimon" }], hand: [{ card: "BT24-084", as: "tamer" }] },
        1: { security: ["BT1-013", "BT1-015"] },
      },
      { autoAcceptOptional: false, autoDeclineOptional: true },
    );
    s.state.memory = 5;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("submarimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tamer").instanceId);
  });

  it("plays a TS Tamer from a public player attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-024", as: "submarimon" }],
          hand: [{ card: "BT24-084", as: "tamer" }],
        },
        1: { security: ["BT1-013", "BT1-015"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("submarimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-084"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("tamer").instanceId,
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not play a non-TS Tamer from a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-024", as: "submarimon" }], hand: [{ card: "BT1-089", as: "nonTsTamer" }] },
        1: { security: ["BT1-091", "BT1-091"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("submarimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("nonTsTamer").instanceId]);
  });

  it("suppresses the second same-turn Tamer play and resets next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-024", as: "submarimon" }],
          hand: [
            { card: "BT24-084", as: "firstTamer" },
            { card: "BT24-084", as: "secondTamer" },
            { card: "BT24-050", as: "unsuspendPlay" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-091"),
        },
        1: {
          security: ["BT1-091", "BT1-091", "BT1-091", "BT1-091", "BT1-091"],
          deck: Array.from({ length: 20 }, () => "BT1-091"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("submarimon").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("firstTamer").instanceId,
    );

    preferred.push(hostId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspendPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("submarimon").isSuspended);
    expect(s.perm("submarimon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length >= 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondTamer").instanceId);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId).includes(
        s.inst("secondTamer").instanceId,
      ),
    );
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("secondTamer").instanceId,
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("uses Armor Purge to survive deletion by trashing its top card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-024", as: "submarimon", under: ["BT24-020"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("submarimon"), "Armor Purge")).toBe(true);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("submarimon").permanentId], "byEffect")).toBe(0);

    expect(s.perm("submarimon").topCard.cardId).toBe("BT24-020");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT24-024");
  });

  it("uses Armor Purge during a public attack deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-024", as: "submarimon", suspended: true, under: ["BT24-020"] }] },
        1: { battleArea: [{ card: "BT24-017", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostPermanentId = s.perm("submarimon").permanentId;
    const armorInstanceId = s.perm("submarimon").topCard.instanceId;
    const sourceInstanceId = s.perm("submarimon").stack[0]!.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === sourceInstanceId),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(armorInstanceId);
  });

  it("trashes the Armor Purge stack when its public refusal is selected", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-024", as: "submarimon", suspended: true, under: ["BT24-020"] }] },
        1: { battleArea: [{ card: "BT24-017", as: "attacker" }] },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("submarimon").permanentId;
    const armorId = s.perm("submarimon").topCard.instanceId;
    const sourceId = s.perm("submarimon").stack[0]!.instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const purge = s.decisions.find(({ req }) => req.kind === "selectCards")!;
    expect(purge.req.options?.min).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: purge.req.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([armorId, sourceId]),
    );
  });

  it.each([
    ["Armadillomon", "BT1-027", 0],
    ["level 3 TS", "BT24-020", 1],
  ])("digivolves from %s for cost 2", async (_label, baseCard, alternateRequirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-024", as: "submarimon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("submarimon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("submarimon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("submarimon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("uses the normal blue level-3 route for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-031", as: "base" }],
        hand: [{ card: "BT24-024", as: "submarimon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("submarimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("submarimon").instanceId);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("submarimon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("rejects a non-TS non-Armadillomon source for an alternate route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-031", as: "base" }], hand: [{ card: "BT24-024", as: "submarimon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("submarimon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("submarimon").instanceId);
    expect(s.perm("base").topCard.instanceId).toBe(baseId);
  });
});
