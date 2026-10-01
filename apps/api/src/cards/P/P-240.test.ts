import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-240.js";
import "../index.js";

describe("P-240 Arcturusmon", () => {
  it("matches the printed Purple/Black level-6 catalog identity", () => {
    expect(getCardDefinition("P-240")).toMatchObject({
      cardId: "P-240",
      nameEn: "Arcturusmon",
      colors: ["Purple", "Black"],
      level: 6,
      playCost: 13,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 5 },
        { color: "Black", level: 5, memoryCost: 5 },
      ],
    });
  });

  it("has Collision, Piercing, Reboot, and Blocker", () => {
    const keywords = runtimeCompiledCard("P-240")!
      .effects.filter((effect) => effect.trigger === "Static")
      .flatMap((effect) => effect.keywords ?? []);
    expect(keywords.map((keyword) => keyword.keyword)).toEqual(["Collision", "Piercing", "Reboot", "Blocker"]);
  });

  it("de-digivolves on play and when digivolving, then uses two qualifying trash cards", () => {
    const effects = runtimeCompiledCard("P-240")!.effects;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            expect.objectContaining({ kind: "DeDigivolve", amount: 3 }),
            expect.objectContaining({
              kind: "GrantStatic",
              duration: "untilOpponentTurnEnd",
              tokens: ["GRANTEFFECT23TOKEN"],
              cost: expect.objectContaining({
                kind: "place",
                destination: "digivolutionStack",
                position: "bottom",
                target: expect.objectContaining({
                  count: 2,
                  from: ["trash"],
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    nameOrTrait: [
                      { tokens: ["Gammamon"], match: "text" },
                      { tokens: ["VB"], match: "trait" },
                    ],
                  },
                }),
              }),
            }),
          ],
        }),
      );
    }
  });

  it("plays Proximamon from hand or trash on deletion and redirects one attack once per turn", () => {
    const effects = runtimeCompiledCard("P-240")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [
          expect.objectContaining({
            kind: "PlayWithoutCost",
            from: ["hand", "trash"],
            optional: true,
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [{ tokens: ["Proximamon"], match: "nameExact" }],
              },
              count: 1,
            },
          }),
        ],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "OpponentsTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenOpponentAttacks",
            actions: [expect.objectContaining({ kind: "RedirectAttack", optional: true })],
          }),
        ],
      }),
    );
  });
});
describe("P-240 engine behavior", () => {
  it("de-digivolves three cards and places two qualifying trash cards underneath", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-240", as: "arcturusmon" }],
          trash: [
            { card: "EX12-007", as: "gammamon" },
            { card: "EX12-013", as: "betelgammamon" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT12-111", as: "target", under: ["BT3-084", "BT10-079", "P-240"] }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceIds = [s.inst("gammamon").instanceId, s.inst("betelgammamon").instanceId];
    const removedIds = [
      s.perm("target").topCard.instanceId,
      ...s
        .perm("target")
        .stack.slice(1)
        .map((card) => card.instanceId),
    ];
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arcturusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("arcturusmon").stack.length === 2 &&
        s.perm("target").stack.length === 0 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("arcturusmon").stack.map((card) => card.instanceId)).toEqual(sourceIds.slice().reverse());
    for (const sourceId of sourceIds) {
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(sourceId);
    }
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(removedIds));
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: -3, reason: "playCard" });
    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(1);

    const securityBefore = s.state.players[0]!.security.length;
    await advance(s.engine).verb.suspend([s.perm("arcturusmon").permanentId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const combat = (
      s.engine as unknown as {
        combat: { hasOpenBlockWindow: boolean; resolveBlock: (seat: number, id?: string) => boolean };
      }
    ).combat;
    await settle(() => combat.hasOpenBlockWindow);
    expect(combat.resolveBlock(0)).toBe(true);
    await settle(
      () =>
        s.state.players[0]!.security.length === securityBefore - 1 &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("also de-digivolves on the digivolving timing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", as: "host" }],
          hand: [{ card: "P-240", as: "arcturusmon" }],
          trash: [
            { card: "EX12-007", as: "gammamon" },
            { card: "EX12-013", as: "betelgammamon" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT12-111", as: "target", under: ["BT3-084", "BT10-079", "P-240"] }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const originalHostId = s.perm("host").topCard.instanceId;
    const removedIds = [
      s.perm("target").topCard.instanceId,
      ...s
        .perm("target")
        .stack.slice(1)
        .map((card) => card.instanceId),
    ];
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: s.inst("arcturusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("arcturusmon").instanceId);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([originalHostId]);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 5, reason: "digivolve" });
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(removedIds));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("gammamon").instanceId, s.inst("betelgammamon").instanceId]),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each(["hand", "trash"] as const)("plays exact Proximamon from %s when it is deleted", async (zone) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-240", as: "arcturusmon", under: [{ card: "BT10-079", as: "parent" }] }],
          ...(zone === "hand"
            ? { hand: [{ card: "EX12-077", as: "proximamon" }] }
            : { trash: [{ card: "EX12-077", as: "proximamon" }] }),
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("arcturusmon").permanentId;
    const parentId = s.inst("parent").instanceId;
    const p240Id = s.inst("arcturusmon").instanceId;
    const proximamonId = s.inst("proximamon").instanceId;
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === proximamonId) &&
        s.state.pendingDecision === undefined,
    );
    const proximamon = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === proximamonId)!;
    expect(proximamon.topCard.cardId).toBe("EX12-077");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(p240Id);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(parentId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("redirects an opponent attack to its inherited host once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-084", as: "host", under: [{ card: "P-240", as: "arcturusmon" }] }],
          hand: [{ card: "BT1-009", as: "ownerPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker" },
            { card: "BT1-009", as: "secondAttacker" },
            { card: "BT1-009", as: "thirdAttacker" },
          ],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    const attack = (alias: "firstAttacker" | "secondAttacker" | "thirdAttacker") =>
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm(alias).permanentId,
        target: { kind: "player" },
      });
    const securityBefore = s.state.players[0]!.security.length;
    const sourceId = s.inst("arcturusmon").instanceId;
    const hostId = s.perm("host").permanentId;
    expect(attack("firstAttacker")).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstAttacker").instanceId) &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);

    const checkedBefore = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(attack("secondAttacker")).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length > checkedBefore &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const checkedAfterTurn = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(attack("thirdAttacker")).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("thirdAttacker").instanceId) &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined &&
        s.events.filter((event) => event.kind === "securityChecked").length === checkedAfterTurn,
    );
    expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("P-240 continuous behavior", () => {
  it("grants Collision to a resident Arcturusmon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-240", as: "arcturusmon" }] } });
    await s.ready();
    const ledger = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(ledger.hasKeyword(s.perm("arcturusmon").permanentId, "Collision")).toBe(true);
  });

  it("digivolves from a Lv.5 [Gammamon]-text or [VB] Digimon for cost 4 (Discord bug 1554511681621729461)", async () => {
    for (const baseCardId of ["EX12-014", "BT10-011"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "P-240", as: "source" }] },
      });
      s.state.memory = 4;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "P-240");
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "base" }], hand: [{ card: "P-240", as: "source" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("plays by Assembly -6 with Lv.5, Lv.4, and Lv.3 [Gammamon]-text or [VB] trash cards", async () => {
    const valid = setupEngine({
      0: {
        hand: [{ card: "P-240", as: "source" }],
        trash: [
          { card: "EX12-014", as: "m0" },
          { card: "BT10-050", as: "m1" },
          { card: "EX12-021", as: "m2" },
        ],
      },
    });
    valid.state.memory = 7;
    await valid.ready();
    expect(
      valid.engine.applyIntent(0, {
        type: "playCard",
        instanceId: valid.inst("source").instanceId,
        assembly: {
          materialInstanceIds: [valid.inst("m0").instanceId, valid.inst("m1").instanceId, valid.inst("m2").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-240"));
    expect(valid.state.memory).toBe(0);

    for (const materials of [
      ["BT1-020", "BT10-050", "EX12-021"],
      ["EX12-014", "EX12-014", "EX12-021"],
    ]) {
      const s = setupEngine({
        0: {
          hand: [{ card: "P-240", as: "source" }],
          trash: materials.map((card, index) => ({ card, as: `m${index}` })),
        },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("source").instanceId,
          assembly: { materialInstanceIds: materials.map((_, index) => s.inst(`m${index}`).instanceId) },
        }),
      ).toEqual({ ok: false, reason: "invalid-material" });
    }
  });
});

describe("P-240 Arcturusmon — KB Q&A rulings", () => {
  const ORDINARY_TARGET = { card: "BT12-111", as: "target", under: ["BT3-084"] };

  async function playArcturusmon(trash: { card: string; as: string }[], target: PermanentSpec = ORDINARY_TARGET) {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-240", as: "arcturusmon" }, "BT1-009"],
          trash,
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [target],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arcturusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("arcturusmon").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    const finish = async () => {
      expect(s.engine.applyIntent(s.state.turnSeat as 0 | 1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    };
    return { s, finish };
  }

  it("counts cards with [Gammamon] in their name or effect text as having it in their text (Q6924)", async () => {
    const { s, finish } = await playArcturusmon([
      { card: "BT10-011", as: "effectText" },
      { card: "BT21-019", as: "nameSubstring" },
      { card: "BT1-010", as: "unrelated" },
    ]);

    expect(
      s
        .perm("arcturusmon")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([s.inst("effectText").instanceId, s.inst("nameSubstring").instanceId].sort());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("unrelated").instanceId]);
    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(1);
    await finish();
  });

  it("makes an affected Digimon attack at its Start of Main Phase with the given effect (Q6925 control)", async () => {
    const { s, finish } = await playArcturusmon([
      { card: "EX12-007", as: "gammamon" },
      { card: "EX12-013", as: "betelgammamon" },
    ]);
    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(1);

    const targetAttacked = () =>
      s.events.some(
        (event) => event.kind === "attackDeclared" && event.attackerPermanentId === s.perm("target").permanentId,
      );
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1 && targetAttacked(), 5000);

    expect(targetAttacked()).toBe(true);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await finish();
  });

  it("gives the attack effect to an unaffected Digimon, but it does not trigger at its Start of Main Phase (Q6925)", async () => {
    const { s, finish } = await playArcturusmon(
      [
        { card: "EX12-007", as: "gammamon" },
        { card: "EX12-013", as: "betelgammamon" },
      ],
      { card: "EX10-010", as: "target" },
    );
    expect(s.perm("arcturusmon").stack).toHaveLength(2);
    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(1);
    const immunityActiveDp = 12000 + 3000;
    expect(s.perm("target").currentDP).toBe(immunityActiveDp);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("target").currentDP).toBe(immunityActiveDp);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(5);
    await finish();
  });

  it("Discord 1555224478416633927 control: places both trash cards at the bottom in one move without a top-or-bottom prompt", async () => {
    const { s, finish } = await playArcturusmon([
      { card: "EX12-007", as: "gammamon" },
      { card: "EX12-013", as: "betelgammamon" },
    ]);
    const materialIds = [s.inst("gammamon").instanceId, s.inst("betelgammamon").instanceId];

    expect([...s.perm("arcturusmon").stack.map((card) => card.instanceId)].sort()).toEqual([...materialIds].sort());
    expect(s.decisions.some(({ req }) => req.kind === "chooseOption" && req.options?.choices?.includes("bottom"))).toBe(
      false,
    );
    const moves = s.events.filter(
      (event) =>
        event.kind === "cardsMoved" &&
        event.to === "battleArea" &&
        event.instanceIds.some((instanceId) => materialIds.includes(instanceId)),
    );
    expect(moves).toHaveLength(1);
    await finish();
  });

  it("does not give the effect when only 1 qualifying card can be placed (Q6926)", async () => {
    const { s, finish } = await playArcturusmon([
      { card: "EX12-007", as: "gammamon" },
      { card: "BT1-010", as: "unrelated" },
    ]);

    expect(s.perm("arcturusmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("gammamon").instanceId);
    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(0);
    await finish();
  });
});
