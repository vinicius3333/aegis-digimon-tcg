import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./BT19-076.js";

describe("BT19-076 Luminamon", () => {
  it("compiles the exact-name digivolve route, the reveal/add chain, and a real ＜Save＞ placement", () => {
    const card = runtimeCompiledCard("BT19-076");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([{ namesExact: ["Shademon"], cost: 2, isAlternate: true }]);
    expect(card?.effects.find((e) => e.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          {
            count: 1,
            to: "hand",
            filter: { nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare", "Twilight"], match: "trait" }] },
          },
        ],
      },
      {
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: { filter: { kind: ["Tamer"], playCostLte: 4 } },
      },
    ]);
    const onDeletion = card?.effects.find((e) => e.trigger === "OnDeletion");
    expect(onDeletion?.keywords).toMatchObject([{ keyword: "Save" }]);
    expect(onDeletion?.actions).toMatchObject([
      {
        kind: "PlaceUnder",
        position: "bottom",
        optional: true,
        target: { isSelf: true },
        underFilter: { controller: "mine", kind: ["Tamer"] },
      },
    ]);
  });

  it("adds the trait match, bottoms the rest in order, and plays a cost-4-or-less Tamer for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-076", as: "lumina" },
            { card: "BT19-081", as: "cheapTamer" },
            { card: "BT13-095", as: "pricyTamer" },
          ],
          deck: ["BT10-058", "BT1-012", "BT1-013", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lumina").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-081"));
    await settle(() => false, 30);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId).sort()).toEqual(["BT19-076", "BT19-081"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT10-058", "BT13-095"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011", "BT1-012", "BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("adds nothing when none of the 3 reveals carries the trait and bottoms all three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-076", as: "lumina" },
            { card: "BT19-081", as: "cheapTamer" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lumina").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-081"));
    await settle(() => false, 30);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-011",
      "BT1-009",
      "BT1-012",
      "BT1-013",
      "BT1-010",
    ]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("leaves the Tamer in hand when the optional play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-076", as: "lumina" },
            { card: "BT19-081", as: "cheapTamer" },
          ],
          deck: ["BT10-058", "BT1-012", "BT1-013", "BT1-010"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lumina").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-058"));
    await settle(() => false, 30);

    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT10-058", "BT19-081"]);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT19-076"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a [Shademon] base for cost 2, keeping the source under it and drawing 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-068", as: "base" }],
          hand: [{ card: "BT19-076", as: "lumina" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;
    const luminaInstanceId = s.inst("lumina").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: luminaInstanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === luminaInstanceId);
    await settle(() => false, 30);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(4000);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("also accepts the other printing that prints the exact name [Shademon] but refuses an unrelated Lv.4 base", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-065", as: "otherShademon" },
            { card: "BT1-014", as: "nearMiss" },
          ],
          hand: [
            { card: "BT19-076", as: "luminaA" },
            { card: "BT19-076", as: "luminaB" },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const refused = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("nearMiss").permanentId,
      instanceId: s.inst("luminaA").instanceId,
      useAlternateCost: true,
      alternateRequirementIndex: 0,
    });
    expect(refused.ok).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("otherShademon").permanentId,
        instanceId: s.inst("luminaB").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherShademon").topCard?.cardId === "BT19-076");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-076", "BT1-010"]);
  });

  it("＜Save＞s itself to the bottom of a Tamer's stack after losing a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-076", as: "lumina" },
            { card: "BT19-081", as: "tamer", under: [{ card: "BT1-011", as: "older" }] },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "wall", suspended: true }], security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const luminaInstanceId = s.inst("lumina").instanceId;
    const olderInstanceId = s.inst("older").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lumina").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("tamer").stack.length === 2);
    await settle(() => false, 30);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([luminaInstanceId, olderInstanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT19-081"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("goes to the trash instead when its controller has no Tamer to ＜Save＞ under", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-076", as: "lumina" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "wall", suspended: true },
            { card: "BT19-081", as: "opponentTamer" },
          ],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const luminaInstanceId = s.inst("lumina").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lumina").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === luminaInstanceId));
    await settle(() => false, 30);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([luminaInstanceId]);
    expect(s.perm("opponentTamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
