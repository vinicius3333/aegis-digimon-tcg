import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-073.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-073", () => {
  it("gains one memory when trashed from hand during your turn", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          fireCondition: { kind: "triggerByYourEffect" },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenTrashedFromHand", fireCondition: { kind: "triggerByYourEffect" } }],
    });
  });
  it("gains memory when an effect trashes a hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-073", as: "source" }],
          hand: [
            { card: "BT14-066", as: "platinum" },
            { card: "BT14-058", as: "numemon" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("platinum").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT14-058") && s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("gains memory from the inherited watcher on a natural effect-driven hand trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-085", as: "host", under: ["BT14-073"] }],
          hand: [
            { card: "BT14-066", as: "platinum" },
            { card: "BT14-058", as: "numemon" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("platinum").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT14-058") && s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });
  it("resets both main and inherited once-per-turn watchers on the next natural turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-073", as: "source" },
            { card: "BT3-085", as: "host", under: ["BT14-073"] },
          ],
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
      () => s.state.players[0]!.trash.filter((card) => card.cardId === "BT14-058").length === 1 && s.state.memory === 4,
    );
    const memoryAfterFirst = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourceB").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.filter((card) => card.cardId === "BT14-058").length === 2 && s.state.memory === -4,
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
        s.state.players[0]!.trash.filter((card) => card.cardId === "BT14-058").length === 3 && s.state.memory === -3,
    );
    expect(s.state.memory).toBe(-3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });
});
