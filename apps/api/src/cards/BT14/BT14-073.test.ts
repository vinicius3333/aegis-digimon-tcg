import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-073.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-073", () => {
  it("gains one memory when trashed from hand during your turn", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenTrashedFromHand",
        fireCondition: { kind: "triggerByYourEffect" },
        actions: [{ kind: "GainMemory", amount: 1 }],
      }],
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
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT14-073"] }],
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
});
