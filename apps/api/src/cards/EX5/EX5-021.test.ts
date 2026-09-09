import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-021.js";
import "./EX5-006.js";
import "./EX5-051.js";
import "../BT9/BT9-047.js";
import "../P/P-130.js";
import "../index.js";

describe("EX5-021 Majiramon", () => {
  it("matches the catalog and encodes every printed trigger and restriction", () => {
    expect(getCardDefinition("EX5-021")).toMatchObject({
      cardId: "EX5-021",
      nameEn: "Majiramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Holy Dragon", "Deva"],
      effectText: expect.stringContaining("When you use an Option card with a cost of 1 or more"),
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] If this Digimon has the [Four Sovereigns]/[God Beast] trait, gain 1 memory.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      {
        kind: "PlayWithoutCost",
        breeding: true,
        payCost: false,
        optional: true,
        from: ["hand"],
        notSameNameAs: ["battleArea", "trash"],
        target: {
          count: 1,
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Deva"] }] },
        },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOptionUsed",
      fireCondition: { kind: "triggerOptionCostAtLeast", value: 1 },
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ match: "trait", tokens: ["Four Sovereigns", "God Beast"] }] },
          },
        },
      ],
    });
  });

  it("answers Q3570: same-name Deva cards in battle area or trash are excluded", async () => {
    for (const zone of ["battleArea", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(zone === "battleArea" ? { battleArea: [{ card: "BT10-079", as: "sameName" }] } : {}),
            ...(zone === "trash" ? { trash: [{ card: "BT10-079", as: "sameName" }] } : {}),
            hand: [
              { card: "EX5-021", as: "majiramon" },
              { card: "BT10-079", as: "candidate" },
            ],
            deck: [{ card: "BT1-009", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[0]!.breeding).toBeUndefined();
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });

  it("answers Q3571: names under Digimon and Tamers do not block the hand candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "digimonHost", under: ["BT10-079"] },
            { card: "EX5-064", as: "tamerHost", under: ["BT10-079"] },
          ],
          hand: [
            { card: "EX5-021", as: "majiramon" },
            { card: "BT10-079", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3572 and Q3574: breeding effect-play suppresses On Play and when-played watchers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "watcherHost", under: ["EX5-006"] }],
          hand: [
            { card: "EX5-021", as: "majiramon" },
            { card: "EX5-051", as: "candidate" },
          ],
          deck: [
            { card: "BT1-010", as: "drawn" },
            { card: "BT1-011", as: "watcherDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("watcherDraw").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-051")).toBe(false);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-006")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3573 through public movement: a breeding Digimon moved this turn cannot attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-021", as: "majiramon" },
            { card: "BT10-079", as: "candidate" },
            { card: "P-130", as: "lui" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("candidate").instanceId,
      ),
    );
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("candidate").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3575: an effect-play restriction prevents the breeding play but not the draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-021", as: "majiramon" },
            { card: "BT10-079", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("honors optional refusal after the mandatory draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-021", as: "majiramon" },
            { card: "BT10-079", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3576/Q5503-Q5506 publicly for paid and zero-cost Option uses", async () => {
    const paid = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-021", as: "majiramon" }],
          hand: [{ card: "BT1-097", as: "paidOption" }],
          deck: [{ card: "BT1-009", as: "paidDraw" }],
        },
      },
      { autoSelectCards: true },
    );
    paid.state.memory = 5;
    await paid.ready();
    expect(paid.engine.applyIntent(0, { type: "playCard", instanceId: paid.inst("paidOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      paid.state.players[0]!.hand.some((card) => card.instanceId === paid.inst("paidDraw").instanceId),
    );
    expect(paid.state.memory).toBe(5);
    expect(paid.state.players[0]!.trash.map((card) => card.instanceId)).toContain(paid.inst("paidOption").instanceId);
    expect(paid.state.pendingDecision).toBeUndefined();

    const zero = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-021", as: "majiramon" },
          { card: "BT1-009", as: "redSource" },
        ],
        hand: [{ card: "BT1-090", as: "zeroOption" }],
      },
    });
    zero.state.memory = 5;
    await zero.ready();
    expect(zero.engine.applyIntent(0, { type: "playCard", instanceId: zero.inst("zeroOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      zero.state.players[0]!.trash.some((card) => card.instanceId === zero.inst("zeroOption").instanceId),
    );
    expect(zero.state.memory).toBe(7);
    expect(zero.state.pendingDecision).toBeUndefined();
  });

  it("proves inherited memory once per turn through a public attack and public unsuspend", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-029", as: "host", under: ["EX5-021"] },
          { card: "BT1-088", as: "greenSource" },
        ],
        hand: [{ card: "BT1-112", as: "unsuspendOption" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "targetA", suspended: true },
          { card: "BT1-010", as: "targetB", suspended: true },
        ],
      },
    });
    await s.ready();
    s.state.phase = Phase.Main;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspendOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("unsuspendOption").instanceId),
    );
    expect(s.state.memory).toBe(7);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("targetA").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard?.cardId !== "BT1-009"));
    expect(s.state.memory).toBe(8);
    await settle(() => s.perm("host").isSuspended === false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("targetB").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(8);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the no-evolution catalog boundary explicit", () => {
    expect(getCardDefinition("EX5-021")?.evoCosts).toEqual([]);
  });
});
