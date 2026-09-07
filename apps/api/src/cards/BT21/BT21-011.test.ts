import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-011.js";
import "../index.js";

describe("BT21-011 Shoutmon", () => {
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

  it("reduces Xros Heart/Hero digivolution costs and grants Rush only while this Digimon has Xros Heart", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            sourceFilter: { isSelfRef: true },
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Xros Heart", "Hero"], match: "trait" }],
            },
            actions: [
              {
                kind: "Replacement",
                event: "wouldDigivolve",
                mode: "reduceCost",
                amount: 1,
                raw: "reduce the digivolution cost by 1",
              },
            ],
          },
        ],
      }),
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [
          {
            kind: "PlaceUnder",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
            optional: true,
          },
        ],
        keywords: [{ keyword: "Save", raw: "＜Save＞" }],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            keyword: { keyword: "Rush", raw: "＜Rush＞" },
            duration: "permanent",
            condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] } },
          },
        ],
      }),
    ]);
  });

  it("grants inherited Rush to a Xros Heart Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-016", as: "shoutmon", under: ["BT21-011"] }] },
    });

    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.None, s.perm("shoutmon"));
    expect(observe(s.engine).hasKeyword(s.perm("shoutmon"), "Rush")).toBe(true);
  });

  it.each([
    ["Xros Heart", "BT21-016"],
    ["Hero", "BT21-013"],
  ])("reduces a matching %s evolution cost by exactly 1", async (_label, target) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-011", as: "shoutmon" }],
        hand: [{ card: target, as: "evolution" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shoutmon").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoutmon").topCard.instanceId === s.inst("evolution").instanceId);
    expect(s.state.memory).toBe(target === "BT21-016" ? 3 : 4);
  });

  it("lets a newly played and evolved Xros Heart host attack with Rush", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT21-011", as: "shoutmon" },
          { card: "BT21-016", as: "king" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { security: ["BT1-003"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoutmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-011"));
    const hostId = s.perm("shoutmon").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: hostId, instanceId: s.inst("king").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoutmon").topCard.cardId === "BT21-016");
    expect(observe(s.engine).hasKeyword(s.perm("shoutmon"), "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
  });

  it("does not let a newly played and evolved non-Xros Hero host attack without Rush", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT21-011", as: "shoutmon" },
          { card: "BT21-013", as: "agunimon" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoutmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-011"));
    const hostId = s.perm("shoutmon").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: hostId, instanceId: s.inst("agunimon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoutmon").topCard.cardId === "BT21-013");
    expect(observe(s.engine).hasKeyword(s.perm("shoutmon"), "Rush")).toBe(false);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toMatchObject({ ok: false });
  });

  it("does not reduce a near-matching non-Xros-Heart/non-Hero evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-011", as: "shoutmon" }],
        hand: [{ card: "BT1-018", as: "flarerizamon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shoutmon").permanentId,
        instanceId: s.inst("flarerizamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoutmon").topCard.cardId === "BT1-018");
    expect(s.state.memory).toBe(3);
  });

  it("grants inherited Rush only to an Xros Heart host and only on your turn", async () => {
    const matching = setupEngine({
      0: { battleArea: [{ card: "BT21-016", as: "matching", under: ["BT21-011"] }] },
    });
    const nonmatching = setupEngine({
      0: { battleArea: [{ card: "BT21-013", as: "nonmatching", under: ["BT21-011"] }] },
    });
    await matching.ready();
    await nonmatching.ready();
    expect(observe(matching.engine).hasKeyword(matching.perm("matching"), "Rush")).toBe(true);
    expect(observe(nonmatching.engine).hasKeyword(nonmatching.perm("nonmatching"), "Rush")).toBe(false);
    matching.state.turnSeat = 1;
    await advance(matching.engine).recompute();
    expect(observe(matching.engine).hasKeyword(matching.perm("matching"), "Rush")).toBe(false);
  });

  it("does not expose inherited Rush from breeding or during the opponent's turn", async () => {
    const breeding = setupEngine({ 0: { breeding: { card: "BT21-016", as: "shoutmon", under: ["BT21-011"] } } });
    await breeding.ready();
    expect(observe(breeding.engine).hasKeyword(breeding.perm("shoutmon"), "Rush")).toBe(false);
    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: "BT21-016", as: "host", under: ["BT21-011"] }] } });
    await opponentTurn.ready();
    opponentTurn.state.turnSeat = 1;
    await advance(opponentTurn.engine).recompute();
    expect(observe(opponentTurn.engine).hasKeyword(opponentTurn.perm("host"), "Rush")).toBe(false);
  });

  it("saves the deleted Shoutmon under one of its Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-011", as: "shoutmon" },
            { card: "BT21-083", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("shoutmon").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT21-011"));
    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT21-011")).toBe(true);
  });
});
