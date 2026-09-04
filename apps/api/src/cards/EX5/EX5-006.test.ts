import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-006.js";
import "../index.js";

describe("EX5-006 Xiaomon", () => {
  it("draws once per turn when one of your Digimon is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", byEffect: true, kind: ["Digimon"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
  });

  it("draws for an effect-played Digimon but not for a manually played Digimon", async () => {
    const effectPlay = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-006"] }],
          hand: [{ card: "BT10-079", as: "effectPlayed" }],
          deck: [{ card: "BT1-010", as: "watcherDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await effectPlay.ready();
    await advance(effectPlay.engine).verb.playInstances([effectPlay.inst("effectPlayed").instanceId], "EX5-006");
    await settle(
      () =>
        effectPlay.state.players[0]!.hand.some((card) => card.instanceId === effectPlay.inst("watcherDraw").instanceId),
      500,
    );
    expect(
      effectPlay.state.players[0]!.hand.some((card) => card.instanceId === effectPlay.inst("watcherDraw").instanceId),
    ).toBe(true);

    const manualPlay = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-006"] }],
        hand: [{ card: "BT1-009", as: "manual" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    await manualPlay.ready();
    manualPlay.state.memory = 2;
    expect(
      manualPlay.engine.applyIntent(0, { type: "playCard", instanceId: manualPlay.inst("manual").instanceId }),
    ).toEqual({ ok: true });
    await settle(
      () => manualPlay.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009"),
      300,
    );
    expect(
      manualPlay.state.players[0]!.hand.some((card) => card.instanceId === manualPlay.inst("drawn").instanceId),
    ).toBe(false);
  });
});
