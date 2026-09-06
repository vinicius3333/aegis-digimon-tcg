import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT25_021 } from "./BT25-021.js";
import "../index.js";

describe("BT25-021 Gaomon", () => {
  it.each([
    ["BT1-004", 0],
    ["ST24-01", 1],
  ] as const)("uses the printed alternate egg route from %s", async (egg, index) => {
    const s = setupEngine({
      0: { breeding: { card: egg, as: "egg" }, hand: [{ card: "BT25-021", as: "gaomon" }], deck: ["BT1-009"] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("gaomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: index,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT25-021");
    expect(s.perm("egg").topCard.cardId).toBe("BT25-021");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual([egg]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("rejects a non-Wanyamon, non-DATA SQUAD egg", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-001", as: "egg" }, hand: [{ card: "BT25-021", as: "gaomon" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("gaomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-021"]);
  });

  it("reveals three and adds the two printed search pools", () => {
    const effect = BT25_021.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: {
          controllerDefault: "mine",
          nameOrTrait: [
            { tokens: ["Thomas H. Norstein"], match: "name" },
            { tokens: ["DATA SQUAD"], match: "trait" },
          ],
        },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Gaogamon"], match: "name" }] },
      }),
    ]);
  });

  it("resolves both search pools through a natural On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-021", as: "gaomon" }],
          deck: [
            { card: "BT25-087", as: "thomas" },
            { card: "BT11-025", as: "gaogamon" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("thomas").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gaogamon").instanceId) &&
        s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("rest").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("thomas").instanceId, s.inst("gaogamon").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("takes an overlapping Gaogamon card once across the two search slots", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-021", as: "gaomon" }],
          deck: [
            { card: "BT25-023", as: "overlap" },
            { card: "BT1-009", as: "restOne" },
            { card: "BT1-010", as: "restTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("overlap").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("overlap").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("restOne").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("restOne").instanceId,
      s.inst("restTwo").instanceId,
    ]);
  });

  it("returns all three misses to the bottom in reveal order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-021", as: "gaomon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-021"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
  });

  it("finds Thomas by name without DATA SQUAD and bottoms the unmatched reveals", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-021", as: "gaomon" }],
          deck: [
            { card: "BT1-009", as: "missOne" },
            { card: "BT4-093", as: "thomas" },
            { card: "BT1-010", as: "missTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("thomas").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("thomas").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("missOne").instanceId,
      s.inst("missTwo").instanceId,
    ]);
  });

  it("draws one for both players once per turn when attacking", () => {
    const effect = BT25_021.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      { kind: "Draw", amount: 1, controller: "mine" },
      { kind: "Draw", amount: 1, controller: "opponent" },
    ]);
  });

  it("draws for both players from a legal inherited stack and does not repeat that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-023", as: "host", under: ["BT25-021"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-001", "BT1-002"], deck: ["BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 2 && s.state.players[1]!.deck.length === 2);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.deck.length).toBe(2);
    expect(s.state.players[1]!.deck.length).toBe(2);
  });
});
