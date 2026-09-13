import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT14-074.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-074", () => {
  it("draws one by trashing a hand card when attacking and gains memory if Eiji is underneath", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      actions: [
        { kind: "Draw", amount: 1, cost: { kind: "trash" } },
        { kind: "GainMemory", amount: 1, condition: { kind: "selfDigivolutionStackHasTrait" } },
      ],
    }));
  it("inherits once-per-turn memory when a Dark Animal or SoC Digimon is played", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }],
    }));
  it("trashes a hand card, draws one, and gains memory when Eiji is underneath", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-074", as: "source", under: ["BT14-087"] }],
          hand: [{ card: "BT1-009", as: "discard" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.memory).toBe(4);
  });

  it("gains memory from the inherited watcher when a matching card is publicly played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-085", as: "host", under: ["BT14-074"] }],
          hand: [
            { card: "BT14-072", as: "fangmon" },
            { card: "BT1-009", as: "discard" },
          ],
          trash: [{ card: "BT14-071", as: "darkAnimal" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fangmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 7 && s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009"));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-071")).toBe(true);
  });

  it("resets the inherited once-per-turn play watcher on the next natural turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-085", as: "host", under: ["BT14-074"] }],
          hand: [
            { card: "BT14-072", as: "fangmonA" },
            { card: "BT14-072", as: "fangmonB" },
            { card: "BT14-072", as: "fangmonC" },
            { card: "BT1-009", as: "discardA" },
            { card: "BT1-009", as: "discardB" },
            { card: "BT1-009", as: "discardC" },
          ],
          trash: [{ card: "BT14-071", as: "darkAnimal" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("discardA").instanceId, s.inst("discardB").instanceId, s.inst("discardC").instanceId);
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 10;

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fangmonA").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 7 && s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009"));
    expect(s.state.memory).toBe(7);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fangmonB").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.memory === 3 && s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-009").length === 2,
    );
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fangmonC").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.memory === 0 && s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-009").length === 3,
    );
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });
});
