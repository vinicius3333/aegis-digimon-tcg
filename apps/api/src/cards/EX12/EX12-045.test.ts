import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-045";

describe("EX12-045 Sanzomon", () => {
  it("matches the catalog, Recovery, watcher, evolution route, and inherited effect", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;

    expect(card).toMatchObject({
      nameEn: "Sanzomon",
      colors: ["Yellow"],
      playCost: 7,
      dp: 7000,
      level: 5,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Monk", "Shambala", "SW"],
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Shambala"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true, optional: true },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Recovery", amount: 1, raw: "＜Recovery +1＞" },
            condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: true,
              reduceCostBy: 2,
              optional: true,
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon", "Tamer"],
                  nameOrTrait: [
                    { tokens: ["Gokuumon"], match: "text" },
                    { tokens: ["SW"], match: "trait" },
                  ],
                },
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("returns security then recovers on both printed timings when two remain", async () => {
    for (const timing of [EffectTiming.OnPlay, EffectTiming.WhenDigivolving]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: cardId, as: "source" }],
            security: ["BT1-010", "BT1-011", "BT1-012"],
            deck: ["BT1-009"],
          },
        },
        { autoAcceptOptional: true },
      );
      await advance(s.engine).fire(timing, s.perm("source"));
      await settle(() => s.state.players[0]!.security.length === 3);

      expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("BT1-010");
      expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-009", "BT1-011", "BT1-012"]);
    }
  });

  it("uses public play and evolution intents for the security-to-hand and Recovery effect", async () => {
    const played = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "source" }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );
    played.state.memory = 7;
    await played.ready();
    expect(played.engine.applyIntent(0, { type: "playCard", instanceId: played.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => played.state.players[0]!.security.length === 3);
    expect(played.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("BT1-010");
    expect(played.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-009", "BT1-011", "BT1-012"]);
    expect(played.state.memory).toBe(0);

    const evolved = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "base" }],
          hand: [{ card: cardId, as: "source" }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true },
    );
    evolved.state.memory = 3;
    await evolved.ready();
    expect(
      evolved.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolved.perm("base").permanentId,
        instanceId: evolved.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => evolved.perm("base").topCard.cardId === cardId && evolved.state.players[0]!.security.length === 3,
    );
    expect(evolved.perm("base").stack.map(({ cardId: id }) => id)).toEqual(["BT1-051"]);
    expect(evolved.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("BT1-010");
    expect(evolved.state.players[0]!.security.map(({ cardId: id }) => id)).toContain("BT1-011");
    expect(evolved.state.memory).toBe(0);
  });

  it("reacts to its own public On Play security removal and pays the reduced effect-play cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX6-024", as: "target" },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("target").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === s.inst("target").instanceId)?.topCard
        .cardId,
    ).toBe("EX6-024");
    expect(
      s.state.players[0]!.battleArea.find(
        ({ topCard }) => topCard.instanceId === s.inst("target").instanceId,
      )?.stack.map(({ cardId: id }) => id),
    ).toContain(cardId);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("BT1-010");
    expect(s.state.memory).toBe(2);
  });

  it("applies the inherited DP reduction once across public attacks, then re-arms next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-058", as: "host", under: [cardId] }],
          hand: [
            { card: "BT1-036", as: "firstUnsuspender" },
            { card: "BT1-036", as: "secondUnsuspender" },
            { card: "BT1-036", as: "thirdUnsuspender" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: [],
        },
        1: {
          battleArea: [
            { card: "BT1-011", as: "firstTarget", dp: 9000 },
            { card: "BT1-011", as: "secondTarget", dp: 9000 },
            { card: "BT1-011", as: "nextTurnTarget", dp: 9000 },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    preferred.push(s.perm("firstTarget").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").currentDP === 5000);
    expect(s.perm("host").topCard.cardId).toBe("BT1-058");
    preferred.splice(0, preferred.length, s.perm("host").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstUnsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);

    preferred.splice(0, preferred.length, s.perm("secondTarget").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    await settle();
    expect(s.perm("secondTarget").currentDP).toBe(9000);
    preferred.splice(0, preferred.length, s.perm("host").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondUnsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    preferred.splice(0, preferred.length, s.perm("host").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdUnsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    preferred.splice(0, preferred.length, s.perm("nextTurnTarget").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("nextTurnTarget").currentDP === 5000);
    expect(s.perm("secondTarget").currentDP).toBe(9000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not react to a public removal from the opponent's security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-058", as: "attacker" },
          ],
          hand: [{ card: "EX12-039", as: "target" }],
          security: [],
        },
        1: { security: ["BT1-009"] },
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
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("EX12-039");
  });

  it("spends the public security-removal watcher only once in a turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "EX12-042", as: "firstGatomon" },
            { card: "EX12-042", as: "secondGatomon" },
            { card: "EX12-039", as: "firstTarget" },
            { card: "EX12-039", as: "secondTarget" },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-009", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();

    for (const [index, alias] of ["firstGatomon", "secondGatomon"].entries()) {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX12-042").length === index + 1 &&
          s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX12-039").length === 1 &&
          s.state.players[0]!.hand.filter(({ cardId: id }) => id === "EX12-039").length === 1,
      );
    }

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX12-039")).toHaveLength(1);
    expect(s.state.players[0]!.hand.filter(({ cardId: id }) => id === "EX12-039")).toHaveLength(1);
  });

  it("keeps Q6810's two reductions separate during a public security-removal event", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "firstSource" },
            { card: cardId, as: "secondSource" },
          ],
          hand: [
            { card: "EX12-042", as: "securityRemover" },
            { card: "EX12-039", as: "firstTarget" },
            { card: "EX12-039", as: "secondTarget" },
          ],
          security: ["BT1-010"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("securityRemover").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX12-039").length === 2,
    );

    expect(s.state.memory).toBe(4);
    expect(
      s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).filter((id) => id === "EX12-039"),
    ).toHaveLength(2);
  });

  it("uses the public watcher with Q6811 and Q6812 play-cost and effect-play locks", async () => {
    const lockedReduction = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "EX12-042", as: "securityRemover" },
            { card: "EX12-039", as: "target" },
          ],
          security: ["BT1-010"],
          deck: ["BT1-009"],
        },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    lockedReduction.state.memory = 11;
    await lockedReduction.ready();
    expect(
      lockedReduction.engine.applyIntent(0, {
        type: "playCard",
        instanceId: lockedReduction.inst("securityRemover").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      lockedReduction.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX12-039"),
    );
    expect(lockedReduction.state.memory).toBe(4);

    const effectPlayLock = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "EX12-042", as: "securityRemover" },
            { card: "EX12-039", as: "target" },
          ],
          security: ["BT1-010"],
          deck: ["BT1-009"],
        },
        1: { battleArea: ["BT9-047"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    effectPlayLock.state.memory = 11;
    await effectPlayLock.ready();
    expect(
      effectPlayLock.engine.applyIntent(0, {
        type: "playCard",
        instanceId: effectPlayLock.inst("securityRemover").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(effectPlayLock.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      effectPlayLock.inst("target").instanceId,
    );
    expect(effectPlayLock.state.memory).toBe(7);
  });

  it("does not recover when three security cards remain after the optional move", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-011", "BT1-012", "BT1-013"]);
    expect(s.state.players[0]!.deck.map(({ cardId: id }) => id)).toEqual(["BT1-009"]);
  });

  it("still recovers after declining the optional security-to-hand instruction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
  });

  it("matches Gokuumon in card text and permits its paid effect-play DigiXros (Q6809)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX6-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("target").instanceId),
    );

    const played = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("target").instanceId,
    );
    expect(played?.stack.map(({ cardId: sourceCardId }) => sourceCardId)).toContain(cardId);
    expect(s.state.memory).toBe(2);
  });

  it("does not combine two copies' reductions into one play (Q6810)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "first" },
            { card: cardId, as: "second" },
          ],
          hand: [
            { card: "EX12-039", as: "firstTarget" },
            { card: "EX12-039", as: "secondTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => s.state.players[0]!.battleArea.length === 4);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX12-039")).toHaveLength(2);
  });

  it("plays for full printed cost when Solarmon forbids reductions (Q6811)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX12-039", as: "target" }] },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("target").instanceId),
    );

    expect(s.state.memory).toBe(0);
  });

  it("activates but cannot play through Pomumon's effect-play lock (Q6812)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX12-039", as: "target" }] },
        1: { battleArea: ["BT9-047"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("ignores opposing security removals and only reacts once to its controller's", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: ["EX12-039", "EX12-039"],
        },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(1);
  });

  it("applies the inherited attack DP reduction only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-058", as: "host", under: [cardId] }] },
        1: { battleArea: [{ card: "BT1-011", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("uses normal yellow and alternate Shambala evolution and rejects a nonmatch", async () => {
    for (const [baseCardId, useAlternateCost] of [
      ["BT1-051", false],
      ["EX12-011", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "AD1-010", as: "base" }], hand: [{ card: cardId, as: "source" }] },
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
});
