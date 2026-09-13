import { advance } from "../../engine/testkit/advance.js";
import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-023.js";

describe("BT11-023 Veemon", () => {
  it("matches the catalog and carries both complete printed contracts", () => {
    expect(getCardDefinition("BT11-023")).toMatchObject({
      cardId: "BT11-023",
      nameEn: "Veemon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Free"],
      types: ["Mini Dragon"],
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }] },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("evolves from blue level 2 for 0", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-002", as: "base" }], hand: [{ card: "BT11-023", as: "veemon" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-023");
    expect(s.state.memory).toBe(2);
  });
  it("adds both a Veedramon Digimon and blue Tamer when both are revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-023", as: "veemon" }],
          deck: [
            { card: "BT11-027", as: "veedramon" },
            { card: "BT11-090", as: "tamer" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);

    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handIds).toContain(s.inst("veedramon").instanceId);
    expect(handIds).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("rest").instanceId);
  });

  it("adds the one available category when only a blue Tamer is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-023", as: "veemon" }],
          deck: [
            { card: "BT11-090", as: "tamer" },
            { card: "BT1-009", as: "rest1" },
            { card: "BT1-009", as: "rest2" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tamer").instanceId);
  });

  it("inherited effect gains memory only when its controller plays a blue Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-026", as: "host", under: ["BT11-023"] }, "BT11-021"],
          hand: [
            { card: "BT11-090", as: "firstTamer" },
            { card: "BT11-090", as: "secondTamer" },
            { card: "BT11-090", as: "thirdTamer" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-014", "BT1-015"],
        },
        1: { deck: ["BT1-016", "BT1-017", "BT1-018", "BT1-019", "BT1-020"], security: ["BT1-021", "BT1-022"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("firstTamer").instanceId),
    );
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.deck).toHaveLength(4);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("secondTamer").instanceId),
    );
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.deck).toHaveLength(4);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("thirdTamer").instanceId),
    );
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("inherited memory triggers only once across two blue Tamers and rejects a non-blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-027", under: ["BT11-023"] }],
        hand: [
          { card: "BT11-090", as: "first" },
          { card: "BT11-090", as: "second" },
        ],
      },
    });
    s.state.memory = 10;
    for (const alias of ["first", "second"] as const) {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst(alias).instanceId),
      );
    }
    // 10 - 3 + 1 - 3: only the first blue Tamer pays the inherited bonus.
    expect(s.state.memory).toBe(5);

    const nonBlue = setupEngine({
      0: {
        battleArea: [{ card: "BT11-027", under: ["BT11-023"] }],
        hand: [{ card: "BT1-085", as: "red" }],
      },
    });
    nonBlue.state.memory = 10;
    expect(nonBlue.engine.applyIntent(0, { type: "playCard", instanceId: nonBlue.inst("red").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => nonBlue.state.players[0]!.battleArea.length === 2);
    expect(nonBlue.state.memory).toBe(6);
  });
});
