import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-030.js";
import "../index.js";

describe("BT21-030 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("verifies the Shoutmon cost replacement, trash DigiXros expansion, stack trash, and attack return", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 1,
          actions: [
            { kind: "SelectBind" },
            { kind: "TrashDigivolution", amount: 99 },
            { kind: "PlaceUnder", targetIsPermanent: true },
          ],
          additionalEffects: [{ kind: "AllowDigiXrosMaterialsFromTrash" }],
        },
      ],
    });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      actions: expect.arrayContaining([
        {
          kind: "SelectBind",
          target: expect.objectContaining({
            filter: expect.objectContaining({
              nameOrTrait: [{ tokens: ["Shoutmon"], match: "nameExact" }],
            }),
          }),
        },
      ]),
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "TrashTopStackedCards",
              amount: 10,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Return",
            to: "deckBottom",
            optional: true,
            target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" }, count: 1 },
          },
        ],
      }),
    );
    expect(compiled.digiXrosRequirement).toEqual([
      {
        materials: [
          {
            nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }],
            differentCardNumbers: true,
          },
        ],
        count: "∞",
        costReduction: 1,
      },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 6, traits: ["Hero"], cost: 5, isAlternate: true }]);
  });

  it("pays 14 and places its Shoutmon cost under the played card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [{ card: "BT21-030", as: "superior" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const shoutmonId = s.perm("shoutmon").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-030"));

    const superior = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-030")!;
    expect(s.state.memory).toBe(-4);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shoutmonId)).toBe(false);
    expect(superior.stack.map((card) => card.cardId)).toContain("BT21-011");
  });

  it("accepts a qualifying trash card as DigiXros material after paying the Shoutmon cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          trash: [{ card: "BT21-021", as: "trashMaterial" }],
          hand: [{ card: "BT21-030", as: "superior" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [s.inst("trashMaterial").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-030"));

    const superior = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-030")!;
    expect(s.state.memory).toBe(-3);
    expect(superior.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT21-011", "BT21-021"]));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashMaterial").instanceId)).toBe(
      false,
    );
  });

  it("publicly accepts variable distinct-number Xros Heart materials and rejects duplicate or near-invalid cards", async () => {
    const valid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [
            { card: "BT21-030", as: "superior" },
            { card: "BT21-021", as: "omni" },
            { card: "BT10-008", as: "x4" },
            { card: "BT10-009", as: "x4b" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    valid.state.memory = 10;
    await valid.ready();
    expect(
      valid.engine.applyIntent(0, {
        type: "playCard",
        instanceId: valid.inst("superior").instanceId,
        digiXros: {
          materialInstanceIds: [
            valid.inst("omni").instanceId,
            valid.inst("x4").instanceId,
            valid.inst("x4b").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-030"));
    const validHost = valid.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT21-030")!;
    expect(validHost.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT21-011", "BT21-021", "BT10-008", "BT10-009"]),
    );
    expect(valid.state.memory).toBe(-1);

    const duplicate = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [
            { card: "BT21-030", as: "superior" },
            { card: "BT10-008", as: "first" },
            { card: "BT10-008", as: "duplicate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    duplicate.state.memory = 10;
    await duplicate.ready();
    expect(
      duplicate.engine.applyIntent(0, {
        type: "playCard",
        instanceId: duplicate.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [duplicate.inst("first").instanceId, duplicate.inst("duplicate").instanceId] },
      }),
    ).toMatchObject({ ok: false });
    expect(duplicate.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        duplicate.inst("superior").instanceId,
        duplicate.inst("first").instanceId,
        duplicate.inst("duplicate").instanceId,
      ]),
    );

    const nearInvalid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [
            { card: "BT21-030", as: "superior" },
            { card: "BT1-009", as: "nonXros" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nearInvalid.state.memory = 10;
    await nearInvalid.ready();
    const nearInvalidHand = nearInvalid.state.players[0]!.hand.map((card) => card.instanceId);
    expect(
      nearInvalid.engine.applyIntent(0, {
        type: "playCard",
        instanceId: nearInvalid.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [nearInvalid.inst("nonXros").instanceId] },
      }),
    ).toMatchObject({ ok: false });
    expect(nearInvalid.state.memory).toBe(10);
    expect(nearInvalid.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(nearInvalidHand);
  });

  it("publicly plays and peels a legal stack down to its bottom Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [{ card: "BT21-030", as: "superior" }],
        },
        1: {
          battleArea: [{ card: "BT21-021", as: "target", under: ["BT21-011", "BT21-016"] }],
          deck: ["BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const peeledIds = [s.perm("target").topCard.instanceId, s.perm("target").stack[1]!.instanceId];

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT21-011" && s.state.pendingDecision === undefined);

    expect(s.perm("target").topCard.cardId).toBe("BT21-011");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(peeledIds);
  });

  it("publicly trashes ten cards from the top of a legal eleven-source DigiXros stack", async () => {
    const materials = [
      "BT10-007",
      "BT10-008",
      "BT10-009",
      "BT10-012",
      "BT10-013",
      "BT10-015",
      "BT10-029",
      "BT10-034",
      "BT10-049",
      "BT10-058",
      "BT11-015",
    ] as const;
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-011", as: "shoutmon" }],
          hand: [
            { card: "BT21-030", as: "superior" },
            ...materials.map((card, index) => ({ card, as: `material${index}` })),
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT21-030",
              as: "target",
              under: materials.map((card, index) => ({ card, as: `targetSource${index}` })),
            },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetSourceIds = s.perm("target").stack.map((card) => card.instanceId);
    const originalTopId = s.perm("target").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("superior").instanceId,
        digiXros: { materialInstanceIds: materials.map((_, index) => s.inst(`material${index}`).instanceId) },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("target").topCard.instanceId === targetSourceIds[1] && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(7);
    expect(s.perm("target").topCard.instanceId).toBe(targetSourceIds[1]);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").stack[0]!.cardId).toBe(materials[0]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([
      originalTopId,
      ...targetSourceIds.slice(2).reverse(),
    ]);
  });

  it("publicly leaves a source-less opponent Digimon unchanged", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-011", as: "shoutmon" }], hand: [{ card: "BT21-030", as: "superior" }] },
        1: { battleArea: [{ card: "BT21-021", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-030"));
    expect(s.perm("target").topCard.cardId).toBe("BT21-021");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it.each([
    { card: "BT21-001", alias: "eggBottom" },
    { card: "BT9-109", alias: "xAntibodyBottom" },
  ])("Q4541/Q4542 publicly peels down to $alias and rule-trashes the invalid remnant", async ({ card, alias }) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-011", as: "shoutmon" }], hand: [{ card: "BT21-030", as: "superior" }] },
        1: { battleArea: [{ card: "BT21-021", as: "target", under: [{ card, as: alias }, "BT21-011", "BT21-016"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetId = s.perm("target").permanentId;
    const bottomId = s.inst(alias).instanceId;
    const allIds = [...s.perm("target").stack, s.perm("target").topCard].map((card) => card.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(allIds));
    expect(s.state.players[1]!.trash.some((saved) => saved.instanceId === bottomId)).toBe(true);
  });

  it("evolves from a Hero level 6 for 5 and peels to the bottom Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-028", as: "hero" }],
          hand: [{ card: "BT21-030", as: "superior" }],
        },
        1: { battleArea: [{ card: "BT21-021", as: "target", under: ["BT21-011", "BT21-016"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hero").permanentId,
        instanceId: s.inst("superior").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hero").topCard.cardId === "BT21-030");
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    expect(s.perm("target").topCard.cardId).toBe("BT21-011");
  });

  it("returns only a source-less opposing Digimon to deck bottom and may decline", async () => {
    for (const accept of [true, false]) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT21-030", as: "superior" }] },
          1: {
            deck: [{ card: "BT1-001", as: "old-bottom" }],
            battleArea: [
              { card: "BT1-009", as: "sourceLess" },
              { card: "BT1-010", as: "stacked", under: ["BT1-002"] },
            ],
          },
        },
        accept ? { autoAcceptOptional: true, autoSelectCards: true } : { autoDeclineOptional: true },
      );
      await s.ready();
      const sourceLessId = s.perm("sourceLess").permanentId;

      await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("superior"));

      expect(
        s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("stacked").permanentId),
      ).toBe(true);
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === sourceLessId)).toBe(!accept);
      expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe(accept ? "BT1-009" : "BT1-001");
    }
  });

  it("returns a source-less Digimon after a real public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-030", as: "superior", enteredThisTurn: false }] },
        1: {
          deck: [{ card: "BT1-001", as: "old-bottom" }],
          battleArea: [
            { card: "BT1-009", as: "sourceLess" },
            { card: "BT1-010", as: "stacked", under: ["BT1-002"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceLessId = s.perm("sourceLess").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("superior").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === sourceLessId));
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-010")).toBe(true);
  });

  it("returns only once across two public attacks after a real Cyclonic Kick unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-030", as: "superior", enteredThisTurn: false },
            { card: "BT1-089", as: "greenTamer" },
          ],
          hand: [{ card: "BT4-108", as: "cyclonicKick" }],
        },
        1: {
          deck: [{ card: "BT1-001", as: "oldBottom" }],
          battleArea: [
            { card: "BT1-009", as: "firstTarget" },
            { card: "BT1-010", as: "secondTarget" },
          ],
          security: ["BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("superior").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstTargetId),
    );

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyclonicKick").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("superior").isSuspended);
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("superior").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 0 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondTargetId)).toBe(true);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-009"]);
  });

  it("publicly declines the optional bottom-deck return and preserves the source-less target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-030", as: "superior", enteredThisTurn: false }] },
        1: {
          deck: [{ card: "BT1-001", as: "old-bottom" }],
          battleArea: [{ card: "BT1-009", as: "sourceLess" }],
          security: ["BT1-002"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceLessId = s.perm("sourceLess").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("superior").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 0 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === sourceLessId)).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-001");
  });
});
