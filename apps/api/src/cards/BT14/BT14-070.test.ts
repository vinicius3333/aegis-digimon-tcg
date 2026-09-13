import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT14-070.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-070", () => {
  it("inherits once-per-turn memory when trashed from hand during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          fireCondition: { kind: "triggerByYourEffect" },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    }));
  it("gains memory when an effect trashes a card from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-074", as: "host", under: ["BT14-070"] }],
          hand: [
            { card: "BT14-066", as: "source" },
            { card: "BT14-058", as: "numemon" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT14-058") && s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("gains memory only once when two natural effect resolutions trash hand cards in the same turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-083", as: "host", under: ["BT14-070"] }],
          hand: [
            { card: "BT14-066", as: "sourceA" },
            { card: "BT14-066", as: "sourceB" },
            { card: "BT14-058", as: "numemonA" },
            { card: "BT14-058", as: "numemonB" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("numemonA").instanceId, s.inst("numemonB").instanceId);
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourceA").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-066") &&
        s.state.players[0]!.trash.filter((card) => card.cardId === "BT14-058").length === 1 &&
        s.state.memory === 3,
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourceB").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT14-058").length === 2);

    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT14-058")).toHaveLength(2);
    expect(s.state.memory).toBe(-5);
  });

  it("resets the inherited once-per-turn watcher on the next natural turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-083", as: "host", under: ["BT14-070"] }],
          hand: [
            { card: "BT14-066", as: "sourceA" },
            { card: "BT14-066", as: "sourceB" },
            { card: "BT14-066", as: "sourceC" },
            { card: "BT14-058", as: "numemonA" },
            { card: "BT14-058", as: "numemonB" },
            { card: "BT14-058", as: "numemonC" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("numemonA").instanceId, s.inst("numemonB").instanceId, s.inst("numemonC").instanceId);
    await s.ready();
    s.state.memory = 10;

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourceA").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.trash.filter((card) => card.cardId === "BT14-058").length === 1 && s.state.memory === 3,
    );
    const memoryAfterFirst = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourceB").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.filter((card) => card.cardId === "BT14-058").length === 2 && s.state.memory === -5,
    );
    expect(s.state.memory).toBe(memoryAfterFirst - 8);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourceC").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.filter((card) => card.cardId === "BT14-058").length === 3 && s.state.memory === -4,
    );
    expect(s.state.memory).toBe(-4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });
});
