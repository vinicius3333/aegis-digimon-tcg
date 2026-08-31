import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-071.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-071", () => {
  it("gains one memory by placing Eiji Nagasumi from hand or trash underneath at the start of main phase", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      cost: { kind: "place", target: { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "name" }] } } },
    }));
  it("inherits once-per-turn memory when a Dark Animal or SoC Digimon is played", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }],
    }));
  it("places Eiji and gains memory at the natural start of main phase", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT14-071", as: "source" }], hand: [{ card: "BT14-087", as: "eiji" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("source").stack.some((card) => card.cardId === "BT14-087") && s.state.memory === 4);
    expect(s.perm("source").stack.some((card) => card.cardId === "BT14-087")).toBe(true);
    expect(s.state.memory).toBe(4);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("gains memory from the inherited watcher when a matching card is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT14-071"] }],
          hand: [
            { card: "BT14-072", as: "fangmon" },
            { card: "BT1-002", as: "discard" },
          ],
          trash: [{ card: "BT14-071", as: "darkAnimal" }],
        },
        1: {},
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("fangmon").instanceId,
      }).ok,
    ).toBe(true);

    await settle(() => s.state.memory === 7 && s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002"));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-071")).toBe(true);
  });
});
