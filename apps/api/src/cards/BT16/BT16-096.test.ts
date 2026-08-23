import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-096.js";

describe("BT16-096", () => {
  it("reveals three for a D-Brigade or DigiPolice card and places itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "RevealAdd", revealCount: 3, rest: "deckTop", add: [{ count: 1, to: "hand" }] },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("models Delay to play a cost 4 or lower matching card from the revealed cards", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [{ kind: "RevealAdd", revealCount: 3, rest: "trash", add: [{ count: 1, to: "play", optional: true }] }],
    });
  });

  it("repeats the reveal/place effect from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "RevealAdd", revealCount: 3 }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("reveals three, adds a D-Brigade card, returns the rest, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-050", as: "color" }],
          hand: [{ card: "BT16-096", as: "option" }],
          deck: ["BT16-050", "BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === "BT16-096"));
    expect(s.state.players[0]?.hand.some((card) => card.cardId === "BT16-050")).toBe(true);
    expect(s.state.players[0]?.deck).toHaveLength(1);
  });
});
