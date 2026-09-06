import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_022 } from "./BT25-022.js";
import "../index.js";

describe("BT25-022 Lunamon", () => {
  it("reveals three and adds one Iliad plus one TS trait card", () => {
    const effect = BT25_022.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
      }),
    ]);
  });

  it("resolves both trait search pools through a natural On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-022", as: "lunamon" }],
          deck: [
            { card: "BT24-011", as: "iliad" },
            { card: "BT25-086", as: "ts" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lunamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("iliad").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ts").instanceId) &&
        s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("rest").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("iliad").instanceId, s.inst("ts").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("returns three all-miss reveals to the bottom in their original order", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT25-022", as: "lunamon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lunamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-022"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
  });

  it("adds one partial TS-only hit and bottoms the other two reveals in order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-022", as: "lunamon" }],
          deck: [
            { card: "BT25-086", as: "tsOnly" },
            { card: "BT1-009", as: "missOne" },
            { card: "BT1-010", as: "missTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lunamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tsOnly").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tsOnly").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("missOne").instanceId,
      s.inst("missTwo").instanceId,
    ]);
  });

  it("uses a legal Lv3 stack into Lv4 whose inherited Jamming survives a higher-DP security battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-022", as: "lunamon" }],
          hand: [{ card: "BT25-024", as: "lekismon" }],
        },
        1: { security: [{ card: "AD1-003", as: "stronger" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lunamon").permanentId,
        instanceId: s.inst("lekismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lunamon").topCard.cardId === "BT25-024");
    expect(s.perm("lunamon").stack.map((card) => card.cardId)).toEqual(["BT25-022"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lunamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("lunamon").permanentId)).toBe(
      true,
    );
  });

  it("does not protect the same stack from a higher-DP normal Digimon battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-022", as: "lunamon" }],
          hand: [{ card: "BT25-024", as: "lekismon" }],
        },
        1: { battleArea: [{ card: "AD1-003", as: "stronger", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lunamon").permanentId,
        instanceId: s.inst("lekismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lunamon").topCard.cardId === "BT25-024");
    const hostId = s.perm("lunamon").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("stronger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((perm) => perm.permanentId === hostId) && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === hostId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "AD1-003")).toBe(true);
  });

  it("preserves inherited Jamming", () => {
    expect(BT25_022.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isInherited: true, keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }),
      ]),
    );
  });

  it("reaches Lunamon through the public Digi-Egg alternate evolution", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT25-001", as: "egg" }, hand: [{ card: "BT25-022", as: "lunamon" }] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("lunamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT25-022");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT25-001"]);
  });

  it("rejects the alternate evolution from a non-TS level-2 base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-069", as: "nonTsBase" }], hand: [{ card: "BT25-022", as: "lunamon" }] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonTsBase").permanentId,
        instanceId: s.inst("lunamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("lunamon").instanceId);
  });
});
