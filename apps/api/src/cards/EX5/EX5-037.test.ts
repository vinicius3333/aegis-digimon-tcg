import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-037.js";
import "../BT9/BT9-047.js";
import "../BT5/BT5-086.js";
import "../P/P-130.js";
import "../index.js";

const VAJRAMON = "EX5-037";
const DEVA = "BT10-079";

describe("EX5-037 Vajramon", () => {
  it("matches the catalog and encodes all printed clauses and OPT boundaries", () => {
    expect(getCardDefinition(VAJRAMON)).toMatchObject({
      cardId: VAJRAMON,
      nameEn: "Vajramon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "Deva"],
      evoCosts: [],
      effectText: expect.stringContaining("When you use an use Option card with a cost of 1 or more"),
      inheritedEffectText: expect.stringContaining("[Your Turn] [Once Per Turn]"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      {
        kind: "PlayWithoutCost",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Deva"], match: "trait" }] },
          count: 1,
        },
        from: ["hand"],
        payCost: false,
        breeding: true,
        notSameNameAs: ["battleArea", "trash"],
        optional: true,
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenOptionUsed",
        fireCondition: { kind: "triggerOptionCostAtLeast", value: 1 },
        actions: [{ kind: "GainMemory", amount: 1 }],
      },
    ]);
    const inherited = compiled.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(inherited?.actions).toEqual([
      {
        kind: "Aura",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
        while: {
          kind: "selfHasTrait",
          filter: { nameOrTrait: [{ tokens: ["Four Sovereigns", "God Beast"], match: "trait" }] },
        },
      },
    ]);
  });

  it("draws then publicly plays a unique Deva into the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: VAJRAMON, as: "vajramon" },
            { card: DEVA, as: "deva" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vajramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("deva").instanceId);

    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("deva").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("deva").instanceId);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("deva").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3601: a same-name Deva in battle area or trash is excluded", async () => {
    for (const zone of ["battleArea", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(zone === "battleArea" ? { battleArea: [{ card: DEVA, as: "existing" }] } : {}),
            ...(zone === "trash" ? { trash: [{ card: DEVA, as: "discarded" }] } : {}),
            hand: [
              { card: VAJRAMON, as: "vajramon" },
              { card: DEVA, as: "duplicate" },
            ],
            deck: [{ card: "BT1-009", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 7;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vajramon").instanceId })).toEqual({
        ok: true,
      });
      await settle();

      expect(s.state.players[0]!.breeding).toBeUndefined();
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("duplicate").instanceId);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });

  it("answers Q3602: names under Digimon or Tamers are not collision zones", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "digimonHost", under: [DEVA] },
            { card: "EX5-064", as: "tamerHost", under: [DEVA] },
          ],
          hand: [
            { card: VAJRAMON, as: "vajramon" },
            { card: DEVA, as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vajramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3603 and Q3605: breeding effect-play suppresses On Play and played watchers", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: VAJRAMON, as: "vajramon" },
            { card: "EX5-021", as: "candidate" },
          ],
          deck: [
            { card: "BT1-009", as: "drawnByVajramon" },
            { card: "BT1-010", as: "mustStay" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vajramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawnByVajramon").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("mustStay").instanceId]);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-021")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3604 through public movement: a breeding Deva cannot attack that turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: VAJRAMON, as: "vajramon" },
            { card: DEVA, as: "candidate" },
            { card: "P-130", as: "lui" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vajramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("candidate").instanceId),
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

  it("answers Q3606: an effect-play restriction prevents the breeding play but not the draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: VAJRAMON, as: "vajramon" },
            { card: DEVA, as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vajramon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gains memory for a paid Option, but not for a zero-cost or security activation", async () => {
    const paid = setupEngine(
      {
        0: {
          battleArea: [
            { card: VAJRAMON, as: "vajramon" },
            { card: "BT1-027", as: "blueSource" },
          ],
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

    const zero = setupEngine({
      0: {
        battleArea: [
          { card: VAJRAMON, as: "vajramon" },
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

    const security = setupEngine({
      0: {
        battleArea: [{ card: VAJRAMON, as: "vajramon" }],
        security: [{ card: "BT1-097", as: "securityOption", faceUp: true }],
        deck: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    security.state.memory = 5;
    await security.ready();
    await advance(security.engine).fireForInstance(EffectTiming.SecuritySkill, security.inst("securityOption"));
    expect(security.state.memory).toBe(5);
    expect(security.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      security.inst("first").instanceId,
      security.inst("second").instanceId,
    ]);
    expect(security.state.pendingDecision).toBeUndefined();
  });

  it("grants inherited Piercing only to live Four Sovereigns/God Beast hosts", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-013", as: "sovereign", under: [VAJRAMON] },
          { card: "EX5-033", as: "godBeast", under: [VAJRAMON] },
          { card: "BT1-015", as: "nonmatching", under: [VAJRAMON] },
        ],
        hand: [{ card: "BT5-086", as: "replacement" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("sovereign"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("godBeast"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("nonmatching"))).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sovereign").permanentId,
        instanceId: s.inst("replacement").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sovereign").topCard?.cardId === "BT5-086");
    expect(s.state.memory).toBe(2);
    expect(s.perm("sovereign").stack.map((card) => card.cardId)).toEqual([VAJRAMON, "EX5-013"]);
    expect(observe(s.engine).hasPierce(s.perm("sovereign"))).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
