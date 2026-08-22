import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-099.js";

describe("BT26-099 compiled fidelity", () => {
  it("records the DM reveal, Delay watcher, and Security Main shape while preserving the Delay seam", () => {
    const card = getCompiledCard("BT26-099");
    expect(card?.coverage).toBe("partial");
    expect(card?.residual).toEqual(["Delay self-trash activation cost and cannot-activate-the-entry-turn guard are not expressible in the current SubTrigger IR."]);
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(card?.effects?.[1]).toMatchObject({ trigger: "AllTurns", keywords: [{ keyword: "Delay" }], actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards" }] });
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "RevealAdd", revealCount: 3 }, { kind: "PlaceInBattleAreaSelf" }]);
  });
});
