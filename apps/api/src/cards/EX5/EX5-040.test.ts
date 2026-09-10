import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-040.js";
import "../BT9/BT9-047.js";
import "../P/P-130.js";
import "../index.js";

const KUMBHIRAMON = "EX5-040";
const DEVA = "BT10-079";

describe("EX5-040 Kumbhiramon", () => {
  it("matches the catalog and encodes all printed clauses and OPT boundaries", () => {
    expect(getCardDefinition(KUMBHIRAMON)).toMatchObject({
      cardId: KUMBHIRAMON,
      nameEn: "Kumbhiramon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "Deva"],
      evoCosts: [],
      effectText: expect.stringContaining("[On Play] ＜Draw 1＞"),
      inheritedEffectText: expect.stringContaining("[Your Turn] [Once Per Turn]"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      {
        kind: "PlayWithoutCost",
        target: {
          filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Deva"], match: "trait" }] },
          count: 1,
          upTo: true,
        },
        payCost: false,
        from: ["hand"],
        breeding: true,
        notSameNameAs: ["battleArea", "trash"],
        optional: true,
      },
    ]);
    const allTurns = compiled.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenSuspended",
        sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
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
          raw: "this Digimon has the [Four Sovereigns]/[God Beast] trait",
        },
      },
    ]);
  });

  it("draws then publicly plays a unique Deva into the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: KUMBHIRAMON, as: "kumbhi" },
            { card: DEVA, as: "deva" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kumbhi").instanceId })).toEqual({
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

  it("answers Q3615: a same-name Deva in battle area or trash is excluded", async () => {
    for (const zone of ["battleArea", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(zone === "battleArea" ? { battleArea: [{ card: DEVA, as: "existing" }] } : {}),
            ...(zone === "trash" ? { trash: [{ card: DEVA, as: "discarded" }] } : {}),
            hand: [
              { card: KUMBHIRAMON, as: "kumbhi" },
              { card: DEVA, as: "duplicate" },
            ],
            deck: [{ card: "BT1-009", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 7;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kumbhi").instanceId })).toEqual({
        ok: true,
      });
      await settle();

      expect(s.state.players[0]!.breeding).toBeUndefined();
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("duplicate").instanceId);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });

  it("answers Q3616: names under Digimon or Tamers are not collision zones", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "digimonHost", under: [DEVA] },
            { card: "EX5-064", as: "tamerHost", under: [DEVA] },
          ],
          hand: [
            { card: KUMBHIRAMON, as: "kumbhi" },
            { card: DEVA, as: "candidate" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kumbhi").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3617 and Q3619: breeding effect-play suppresses On Play and played watchers", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: KUMBHIRAMON, as: "kumbhi" },
            { card: "EX5-021", as: "candidate" },
          ],
          deck: [
            { card: "BT1-009", as: "drawnByKumbhi" },
            { card: "BT1-010", as: "mustStay" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kumbhi").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("candidate").instanceId);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawnByKumbhi").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("mustStay").instanceId]);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-021")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3618 through public movement: a breeding Deva cannot attack that turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: KUMBHIRAMON, as: "kumbhi" },
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kumbhi").instanceId })).toEqual({
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

  it("answers Q3620: an effect-play restriction prevents the breeding play but not the draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: KUMBHIRAMON, as: "kumbhi" },
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kumbhi").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("draws once when an opposing Digimon becomes suspended and ignores a second same-turn suspension", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: KUMBHIRAMON, as: "kumbhi" }],
        security: ["BT1-011", "BT1-012"],
        deck: [
          { card: "BT1-009", as: "firstDraw" },
          { card: "BT1-010", as: "sameTurnStay" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-021", as: "firstOpponent" },
          { card: "BT1-022", as: "secondOpponent" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const loop = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstOpponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstDraw").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("firstDraw").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("sameTurnStay").instanceId]);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondOpponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("sameTurnStay").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("sameTurnStay").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants inherited Piercing only to live Four Sovereigns/God Beast hosts", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-013", as: "sovereign", under: [KUMBHIRAMON] },
          { card: "EX5-033", as: "godBeast", under: [KUMBHIRAMON] },
          { card: "BT1-015", as: "nonmatching", under: [KUMBHIRAMON] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("sovereign"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("godBeast"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("nonmatching"))).toBe(false);

    expect(s.state.pendingDecision).toBeUndefined();
  });
});
