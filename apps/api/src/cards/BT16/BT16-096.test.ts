import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-096.js";

describe("BT16-096", () => {
  it("reveals three for a D-Brigade or DigiPolice card and places itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckTop", add: [{ count: 1, to: "hand" }] }, { kind: "PlaceInBattleAreaSelf" }] });
  });

  it("models Delay to play a cost 4 or lower matching card from the revealed cards", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Main", keywords: [{ keyword: "Delay" }], actions: [{ kind: "RevealAdd", revealCount: 3, rest: "trash", add: [{ count: 1, to: "play", optional: true }] }] });
  });

  it("repeats the reveal/place effect from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "RevealAdd", revealCount: 3 }, { kind: "PlaceInBattleAreaSelf" }] });
  });
});
