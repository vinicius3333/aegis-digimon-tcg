import { Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-036.js";
import "../index.js";

describe("BT21-036 compiled implementation", () => {
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

  it("preserves Blocker and Armor Purge", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] }),
    );
  });

  it("unsuspends itself and reduces one opposing Digimon by 2000 per Armor Form card in trash", () => {
    const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions).toEqual([
      {
        kind: "Unsuspend",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      },
      {
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: -2000,
        duration: "forTheTurn",
        scaling: {
          per: 1,
          filter: {
            zone: "trash",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Armor Form"], match: "trait" }],
          },
          unit: "trash",
        },
      },
    ]);
  });

  it("preserves both alternate Digivolution requirements", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Veemon"], cost: 3, isAlternate: true },
      { level: 3, traits: ["Hero"], cost: 3, isAlternate: true },
    ]);
  });

  it.each([
    { base: "BT21-032", route: "Veemon" },
    { base: "BT21-011", route: "level-3 Hero" },
  ])("evolves from $route for 3 reduced to 2 by the realistic source stack", async ({ base }) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "BT21-036", as: "magnamon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-036");

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Armor Purge")).toBe(true);
  });

  it("uses Blocker in a public attack battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-036", as: "magnamon" }], deck: ["BT1-009", "BT1-009"] },
        1: {
          battleArea: [{ card: "BT21-011", as: "attacker", dp: 3000 }],
          security: ["BT1-001"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const blockerId = s.perm("magnamon").permanentId;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === blockerId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
  });

  it("uses Armor Purge in a public battle and leaves the underlying source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-032", as: "source", under: [] }],
          hand: [{ card: "BT21-036", as: "magnamon" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT21-011", as: "attacker", dp: 9000 }],
          security: ["BT1-001"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("magnamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT21-036");
    await advance(s.engine).verb.suspend([s.perm("source").permanentId]);
    s.state.turnSeat = 1;
    const defenderId = s.perm("source").permanentId;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(
      s.state.players[0]!.battleArea.some((p) => p.permanentId === defenderId && p.topCard.cardId === "BT21-032"),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-036")).toBe(true);
  });

  it("unsuspends and gives one target -2000 DP per Armor Form card in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-032", as: "veemon", suspended: true }],
          hand: [{ card: "BT21-036", as: "magnamon" }],
          trash: ["BT21-035", "P-137", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 10000 },
            { card: "BT1-010", as: "other", dp: 9000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("magnamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.cardId === "BT21-036");

    expect(s.perm("veemon").isSuspended).toBe(false);
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.perm("other").currentDP).toBe(9000);
    s.give(0, Zone.Deck, "BT1-001");
    s.give(1, Zone.Deck, "BT1-002");
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(10000);
  });

  it("does not reduce DP when no Armor Form card is in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-032", as: "veemon", suspended: true }],
          hand: [{ card: "BT21-036", as: "magnamon" }],
          trash: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("magnamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.cardId === "BT21-036");

    expect(s.perm("target").currentDP).toBe(9000);
    expect(s.perm("veemon").isSuspended).toBe(false);
  });
});
