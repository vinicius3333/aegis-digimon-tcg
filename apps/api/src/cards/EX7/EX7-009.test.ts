import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-009.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX7-009 Lavorvomon", () => {
  it("compiles the catalog clauses and both printed evolution routes", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(getCardDefinition("EX7-009")).toMatchObject({
      cardId: "EX7-009",
      nameEn: "Lavorvomon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 4000,
      evoCosts: [
        { color: "Red", level: 3, memoryCost: 2 },
        { color: "Black", level: 3, memoryCost: 2 },
      ],
      types: ["Rock Dragon"],
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Return",
            to: "hand",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  { tokens: ["Machine Dragon", "Sky Dragon"], match: "trait" },
                  { tokens: ["Hina Kurihara"], match: "nameExact" },
                ],
              },
              count: 1,
            },
          },
        ],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            condition: {
              kind: "zoneCount",
              seat: "mine",
              zone: "battleArea",
              filter: { kind: ["Tamer"] },
              op: "lte",
              value: 1,
              raw: "you have 1 or less Tamers",
            },
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Hina Kurihara"], match: "nameExact" }] },
              count: 1,
            },
          },
        ],
      },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
      },
    ]);
  });

  it("plays publicly and returns one matching trait card from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-009", as: "lavorvomon" }],
          trash: ["EX7-042", "EX7-065", "EX3-065"],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
        1: { deck: ["BT1-014"], security: ["BT1-014"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lavorvomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX7-042"));

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX7-009")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX7-042");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX7-065", "EX3-065"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("returns exact Hina by name while leaving a nonmatching Tamer in trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-009", as: "lavorvomon" }],
          trash: ["EX7-065", "EX3-065"],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
        1: { deck: ["BT1-014"], security: ["BT1-014"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lavorvomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX3-065"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX3-065");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX7-065"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("legally digivolves from Red Lv3, draws, preserves the source stack, and plays Hina", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [{ card: "EX7-009", as: "lavorvomon" }, "EX3-065", "EX7-065"],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
        1: { deck: ["BT1-014"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceInstanceId = s.perm("base").topCard!.instanceId;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lavorvomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-009");

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === drawInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX3-065")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX7-065");
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("allows the evolution but declines the optional Hina play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [{ card: "EX7-009", as: "lavorvomon" }, "EX3-065"],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
        1: { deck: ["BT1-014"], security: ["BT1-014"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lavorvomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-009");

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX3-065");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX3-065")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does not play Hina when two Tamers already occupy the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }, "EX7-065", "EX3-065"],
          hand: [{ card: "EX7-009", as: "lavorvomon" }, "EX3-065"],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
        1: { deck: ["BT1-014"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lavorvomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-009");

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "EX3-065")).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX3-065");
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("supports the printed Black Lv3 route and rejects a Lv4 source without changing state", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT14-055", as: "blackBase" }],
        hand: [{ card: "EX7-009", as: "lavorvomon" }],
        deck: ["BT1-013"],
        security: ["BT1-014"],
      },
      1: { deck: ["BT1-014"], security: ["BT1-014"] },
    });
    await legal.ready();
    legal.state.memory = 5;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("blackBase").permanentId,
        instanceId: legal.inst("lavorvomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("blackBase").topCard?.cardId === "EX7-009");
    expect(legal.state.memory).toBe(3);
    assertNoLoudGap(legal);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "tooLarge" }],
        hand: [{ card: "EX7-009", as: "lavorvomon" }],
        deck: ["BT1-013"],
        security: ["BT1-014"],
      },
      1: { deck: ["BT1-014"], security: ["BT1-014"] },
    });
    await illegal.ready();
    const handBefore = illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const deckBefore = illegal.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    illegal.state.memory = 5;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("tooLarge").permanentId,
        instanceId: illegal.inst("lavorvomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.memory).toBe(5);
    expect(illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
    expect(illegal.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
    expect(illegal.perm("tooLarge").topCard?.cardId).toBe("BT1-014");
    expect(illegal.perm("tooLarge").stack).toHaveLength(0);
    assertNoLoudGap(illegal);
  });

  it("applies inherited +2000 DP only during its owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-009"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(3000);
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("is observable through the real turn loop after a legal evolution stack is established", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT1-001", as: "egg" }],
        hand: [
          { card: "BT1-009", as: "redBase" },
          { card: "EX7-009", as: "lavorvomon" },
        ],
        deck: ["BT1-013", "BT1-014", "BT1-011"],
        security: ["BT1-014"],
      },
      1: { deck: ["BT1-014"], security: ["BT1-014"] },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-001");
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("redBase").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-009");
    const baseInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("lavorvomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]!.topCard?.cardId === "EX7-009");

    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(s.state.memory).toBe(3);
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId, baseInstanceId]);
    expect(carrier.stack.map(({ cardId }) => cardId)).toEqual(["BT1-001", "BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
