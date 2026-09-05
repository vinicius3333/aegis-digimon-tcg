import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-056.js";

describe("EX5-056 Syakomon", () => {
  it("draws based on opposing Digimon and trashes one card from hand on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "Draw",
        amount: 1,
        scaling: { per: 1, unit: "cards", filter: { controller: "opponent", kind: ["Digimon"] } },
      },
      { kind: "Trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
    ]);
  });
  it("inherits once-per-turn memory when an opponent plays a Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"], byEffect: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("draws once per opposing Digimon and then trashes one card from hand on public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-056", as: "source" },
            { card: "BT1-001", as: "discard" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentOne" },
            { card: "BT1-010", as: "opponentTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("gains memory once when an effect plays an opponent's Digimon, but not for a manual play", async () => {
    const effectPlay = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-056"] }] },
      1: {
        hand: [
          { card: "BT1-009", as: "effectPlayed" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    await effectPlay.ready();
    effectPlay.state.memory = 0;
    await advance(effectPlay.engine).verb.playInstances([effectPlay.inst("effectPlayed").instanceId], "EX5-056");
    await advance(effectPlay.engine).verb.playInstances([effectPlay.inst("second").instanceId], "EX5-056");
    await settle();
    expect(effectPlay.state.memory).toBe(1);

    const manualPlay = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-056"] }] },
      1: { hand: [{ card: "BT1-009", as: "manual" }] },
    });
    manualPlay.state.turnSeat = 1;
    manualPlay.state.memory = 10;
    await manualPlay.ready();
    expect(
      manualPlay.engine.applyIntent(1, { type: "playCard", instanceId: manualPlay.inst("manual").instanceId }),
    ).toEqual({ ok: true });
    await settle();
    expect(manualPlay.state.memory).toBe(8);
  });
});
