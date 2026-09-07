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
        battleArea: [{ card: base, as: "base", under: ["BT21-002"] }],
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
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT21-002", base]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Armor Purge")).toBe(true);
  });

  it("rejects both alternate requirements from a legal non-Veemon, non-Hero Lv3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-033", as: "floramon", under: ["BT21-003"] }],
        hand: [{ card: "BT21-036", as: "magnamon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();
    const sourceId = s.perm("floramon").permanentId;
    const handId = s.inst("magnamon").instanceId;
    for (const alternateRequirementIndex of [0, 1]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: sourceId,
          instanceId: handId,
          useAlternateCost: true,
          alternateRequirementIndex,
        }),
      ).toMatchObject({ ok: false });
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === handId)).toBe(true);
      expect(s.perm("floramon").topCard.cardId).toBe("BT21-033");
      expect(s.state.memory).toBe(4);
    }
  });

  it("uses Blocker in a public attack battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-036", as: "magnamon" }], deck: ["BT1-009", "BT1-009"] },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
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
          battleArea: [{ card: "BT1-059", as: "attacker" }],
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
    s.state.turnSeat = 1;
    const defenderId = s.perm("source").permanentId;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: defenderId })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.events.some((event) => event.kind === "combatResolved"));
    expect(
      s.state.players[0]!.battleArea.some((p) => p.permanentId === defenderId && p.topCard.cardId === "BT21-032"),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-036")).toBe(true);
  });

  it("unsuspends and gives one target -2000 DP per Armor Form card in trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-032", as: "veemon", suspended: true, under: ["BT21-002"] }],
          hand: [{ card: "BT21-036", as: "magnamon" }],
          trash: ["BT21-035", "P-137", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "target" },
            { card: "BT1-042", as: "other" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    await s.ready();
    preferred.push(s.perm("other").topCard.instanceId);

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
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.perm("other").currentDP).toBe(6000);
    s.give(0, Zone.Deck, "BT1-001");
    s.give(1, Zone.Deck, "BT1-002");
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.perm("other").currentDP).toBe(10000);
  });

  it("does not reduce DP when no Armor Form card is in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-032", as: "veemon", suspended: true }],
          hand: [{ card: "BT21-036", as: "magnamon" }],
          trash: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-059", as: "target" }] },
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
