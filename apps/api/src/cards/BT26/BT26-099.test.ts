import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT26-099.js";
import "../index.js";

describe("BT26-099 compiled fidelity", () => {
  it("records the DM reveal, Delay watcher, and Security Main shape while preserving the Delay seam", () => {
    const card = getCompiledCard("BT26-099");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(card?.effects?.[1]).toMatchObject({ trigger: "AllTurns", keywords: [{ keyword: "Delay" }], actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", addedDigivolutionCardFilter: { faceDown: true }, actions: [{ kind: "Digivolve", target: { filter: { useTriggerSource: true } }, payCost: false }] }] });
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "RevealAdd", revealCount: 3 }, { kind: "PlaceInBattleAreaSelf" }]);
  });

  it("reveals a DM card and plays Training Manual from Security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT26-099", as: "manual", faceUp: true }],
        deck: ["BT26-023", "BT1-001", "BT1-002"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("manual"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-099")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT26-023")).toBe(true);
  });
});
