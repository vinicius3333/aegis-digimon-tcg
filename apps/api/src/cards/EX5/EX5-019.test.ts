import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-019.js";
import "./EX5-006.js";
import "./EX5-051.js";
import "../BT9/BT9-047.js";
import "../P/P-130.js";
import "../index.js";

describe("EX5-019 Antylamon", () => {
  it("matches the catalog and encodes every printed trigger and restriction", () => {
    expect(getCardDefinition("EX5-019")).toMatchObject({
      cardId: "EX5-019",
      nameEn: "Antylamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Holy Beast", "Deva"],
      effectText:
        "[On Play] ＜Draw 1＞ (Draw 1 card from your deck). Then, you may play 1 [Deva] trait Digimon card without the same name as the cards in your battle area or trash from your hand to an empty space in your breeding area without paying the cost.[When Attacking] Trash the bottom digivolution card of 1 of your opponent's Digimon.",
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
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions).toEqual([
      {
        kind: "TrashDigivolution",
        target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
        amount: 1,
        fromTop: false,
      },
    ]);
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

  it("answers Q3563: same-name cards in battle area or trash are excluded after the mandatory draw", async () => {
    for (const zone of ["battleArea", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(zone === "battleArea" ? { battleArea: [{ card: "BT10-079", as: "sameName" }] } : {}),
            ...(zone === "trash" ? { trash: [{ card: "BT10-079", as: "sameName" }] } : {}),
            hand: [
              { card: "EX5-019", as: "antylamon" },
              { card: "BT10-079", as: "candidate" },
            ],
            deck: [{ card: "BT1-009", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("antylamon").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[0]!.breeding).toBeUndefined();
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });

  it("answers Q3564: names under Digimon and Tamers do not block the hand candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "digimonHost", under: ["BT10-079"] },
            { card: "EX5-064", as: "tamerHost", under: ["BT10-079"] },
          ],
          hand: [
            { card: "EX5-019", as: "antylamon" },
            { card: "BT10-079", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("antylamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3565 and Q3567: breeding effect-play suppresses On Play and when-played watchers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "watcherHost", under: ["EX5-006"] }],
          hand: [
            { card: "EX5-019", as: "antylamon" },
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("antylamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("watcherDraw").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-051")).toBe(false);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-006")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3566 through public movement: a breeding Digimon moved this turn cannot attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-019", as: "antylamon" },
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("antylamon").instanceId })).toEqual({
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

  it("answers Q3568: an effect-play restriction prevents the breeding play but not the draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-019", as: "antylamon" },
            { card: "BT10-079", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("antylamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("honors the optional Deva play decline after the mandatory draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-019", as: "antylamon" },
            { card: "BT10-079", as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("antylamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes the bottom card of an opponent's digivolution stack on attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-019", as: "antylamon" }] },
        1: {
          battleArea: [{ card: "BT1-030", as: "target", under: ["BT1-009", "BT1-010"] }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gains inherited memory once per turn through a public attack on a Four Sovereigns host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-029", as: "host", under: ["EX5-019"] },
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
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("unsuspendOption").instanceId));
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
    expect(getCardDefinition("EX5-019").evoCosts).toEqual([]);
  });
});
