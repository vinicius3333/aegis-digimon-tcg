import { describe, expect, it } from "vitest";
import {
  compiledEffects,
  digivolutionRequirementsFor,
  dnaDigivolutionRequirementsFor,
  getCardDefinition,
} from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX12-077.js";

describe("EX12-077 Proximamon", () => {
  it("retains the normal level 6 routes and printed keywords", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, texts: ["Gammamon"], cost: 5, isAlternate: true },
      { level: 6, traits: ["VB"], cost: 5, isAlternate: true },
    ]);

    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: [expect.objectContaining({ keyword: "SecurityAttack", amount: 1 })],
        }),
        expect.objectContaining({
          trigger: "Static",
          keywords: [expect.objectContaining({ keyword: "Blocker" })],
        }),
      ]),
    );
  });

  it("scopes both printed sources exactly as the text reads", () => {
    const playWindows = compiled.effects.filter((effect) => effect.sharedUseKey === "ir-shared-0");
    expect(playWindows).toHaveLength(4);
    expect(playWindows.map(({ trigger }) => trigger)).toEqual([
      "OnPlay",
      "WhenDigivolving",
      "WhenAttacking",
      "Counter",
    ]);
    for (const effect of playWindows) {
      expect(effect.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["digivolutionCards"],
        payCost: false,
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon", "Tamer", "Option"],
            playCostLte: 10,
            hostFilter: { kind: ["Digimon"], zone: "battleArea" },
          },
        },
      });
      expect(irNode(effect.actions[0]).target.filter.hostFilter.isSelfRef).toBeUndefined();
    }

    const placementCosts = compiled.effects
      .flatMap((effect) => effect.actions)
      .filter((action) => action.kind === "Delete")
      .map((action) => irNode(action).cost);
    expect(placementCosts).toHaveLength(2);
    for (const cost of placementCosts) {
      expect(cost.target.filter.kind).toBeUndefined();
      expect(cost).toMatchObject({
        kind: "place",
        destination: "digivolutionStack",
        position: "choice",
        host: "target",
        underFilter: { controller: "mine", kind: ["Digimon"] },
        target: { count: 2, from: ["hand", "trash"] },
      });
    }
  });

  it("expands the printed DNA color alternatives into all four cost-0 routes", () => {
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Red", level: 6 },
          { color: "Black", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Red", level: 6 },
          { color: "Purple", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 6 },
          { color: "Black", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 6 },
          { color: "Purple", level: 6 },
        ],
      },
    ]);
    expect(digivolutionRequirementsFor("EX12-077")).toEqual(compiled.digivolutionRequirement);
    expect(dnaDigivolutionRequirementsFor("EX12-077")).toEqual(compiled.dnaDigivolveRequirement);
    expect(registeredCompiledCards.get("EX12-077")).toEqual(compiled);
    expect(compiledEffects["EX12-077"]).toBeDefined();
    expect(compiledEffects["EX12-077"]).toEqual(compiled);
  });

  it("places exactly two matching cards and deletes an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-077", as: "proximamon" },
            { card: "EX12-005", as: "sourceOne" },
          ],
          trash: [{ card: "EX12-007", as: "sourceTwo" }],
          battleArea: [{ card: "EX12-005", as: "host" }],
        },
        1: { battleArea: [{ card: "EX12-005", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("proximamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const host = s.perm("host");
    expect(host.stack.map((card) => card.cardId)).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sourceOne").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sourceTwo").instanceId)).toBe(false);
  });

  it("does not pay or delete when fewer than two matching cards are available", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-077", as: "proximamon" },
            { card: "EX12-005", as: "source" },
          ],
          battleArea: [{ card: "EX12-005", as: "host" }],
        },
        1: { battleArea: [{ card: "EX12-005", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("proximamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX12-077"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack).toHaveLength(0);
  });

  it("plays only a matching card costing 10 or less from a Digimon's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX12-077",
              as: "proximamon",
              under: ["EX12-035", "EX12-013"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("proximamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX12-013"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX12-013")).toBe(true);
    expect(s.perm("proximamon").stack.map((card) => card.cardId)).toEqual(["EX12-035"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX12-035")).toBe(false);
  });

  it("uses a qualifying Option from a Digimon's stack instead of playing it as a permanent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-077", as: "proximamon", under: ["EX12-069"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("proximamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ cardId }) => cardId === "EX12-069"));

    expect(s.perm("proximamon").stack).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "EX12-069", faceUp: true });
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX12-069")).toBe(false);
  });

  it("pays the placement cost with a non-Digimon card carrying the VB trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-077", as: "proximamon" },
            { card: "EX12-073", as: "optionSource" },
          ],
          trash: [{ card: "EX12-007", as: "digimonSource" }],
          battleArea: [{ card: "EX12-005", as: "host" }],
        },
        1: { battleArea: [{ card: "EX12-005", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("proximamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(
      s
        .perm("host")
        .stack.map((card) => card.cardId)
        .sort(),
    ).toEqual(["EX12-007", "EX12-073"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("optionSource").instanceId)).toBe(false);
  });

  it("plays a qualifying card out of another of your Digimon's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-077", as: "proximamon" },
            { card: "EX12-005", as: "ally", under: ["EX12-013"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("proximamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX12-013"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX12-013")).toBe(true);
    expect(s.perm("ally").stack).toHaveLength(0);
  });

  it("does not reach a qualifying card stacked under one of your Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-077", as: "proximamon" },
            { card: "EX12-066", as: "tamer", under: ["EX12-013"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("proximamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX12-013")).toBe(false);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["EX12-013"]);
  });

  it("shares one once-per-turn use across real When Digivolving and attack windows", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-240", as: "base" },
            { card: "EX12-005", as: "ally", under: ["EX12-013", "EX12-007"] },
          ],
          hand: [{ card: "EX12-077", as: "proximamon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("proximamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === "EX12-077" &&
        s.state.players[0]!.battleArea.some(
          ({ topCard }) => topCard.cardId === "EX12-013" || topCard.cardId === "EX12-007",
        ),
    );

    const remainingSourceId = s.perm("ally").stack[0]!.instanceId;
    expect(s.perm("ally").stack).toHaveLength(1);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("ally").stack.map(({ instanceId }) => instanceId)).toEqual([remainingSourceId]);
    expect(
      s.state.players[0]!.battleArea.filter(({ topCard }) => ["EX12-013", "EX12-007"].includes(topCard.cardId)),
    ).toHaveLength(1);
  });

  it("plays a qualifying card from its stack through a real opponent attack Counter window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: ["BT1-010"],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "EX12-077", as: "proximamon", under: ["EX12-013", "EX12-007"] }],
          security: ["BT1-011"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter window did not open");
    expect(opened.defendingSeat).toBe(1);
    const eligible = opened.eligibleCounters.find(({ instanceId }) => instanceId === s.inst("proximamon").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some(
          ({ topCard }) => topCard.cardId === "EX12-013" || topCard.cardId === "EX12-007",
        ) && s.perm("proximamon").stack.length === 1,
    );

    expect(s.perm("proximamon").stack).toHaveLength(1);
    expect(
      s.state.players[1]!.battleArea.filter(
        ({ topCard }) => topCard.cardId === "EX12-013" || topCard.cardId === "EX12-007",
      ),
    ).toHaveLength(1);
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the alternate evolution route and rejects an unrelated level-6 base", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "P-240", as: "base" }], hand: [{ card: "EX12-077", as: "source" }] },
    });
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === "EX12-077");
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-044", as: "base" }], hand: [{ card: "EX12-077", as: "source" }] },
    });
    invalid.state.memory = 5;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("DNA digivolves through all four printed color combinations and rejects an invalid pair", async () => {
    for (const [firstCardId, secondCardId] of [
      ["BT1-025", "BT2-064"],
      ["BT1-025", "BT10-082"],
      ["BT1-043", "BT2-064"],
      ["BT1-043", "BT10-082"],
    ] as const) {
      const legal = setupEngine({
        0: {
          battleArea: [
            { card: firstCardId, as: "first" },
            { card: secondCardId, as: "second" },
          ],
          hand: [{ card: "EX12-077", as: "source" }],
        },
      });
      await legal.ready();
      expect(
        legal.engine.applyIntent(0, {
          type: "dnaDigivolve",
          materialPermanentIds: [legal.perm("first").permanentId, legal.perm("second").permanentId],
          instanceId: legal.inst("source").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => legal.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX12-077"));
      expect(legal.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-025", as: "first" },
          { card: "BT1-043", as: "second" },
        ],
        hand: [{ card: "EX12-077", as: "source" }],
      },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [invalid.perm("first").permanentId, invalid.perm("second").permanentId],
        instanceId: invalid.inst("source").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("matches the complete catalog identity", () => {
    expect(getCardDefinition("EX12-077")).toMatchObject({
      nameEn: "Proximamon",
      colors: ["White", "Red", "Purple"],
      kinds: ["Digimon"],
      playCost: 15,
      dp: 15000,
      level: 7,
      evoCosts: [
        { color: "Red", level: 6, memoryCost: 5 },
        { color: "Purple", level: 6, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Unique", "VB"],
    });
  });
});
