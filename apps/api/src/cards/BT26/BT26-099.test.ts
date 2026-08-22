import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-099.js";
import "../index.js";

describe("BT26-099 compiled fidelity", () => {
  it("records the DM reveal, Delay watcher, and Security Main shape while preserving the Delay seam", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "RevealAdd", revealCount: 3, rest: "deckBottom" },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    expect(card?.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          addedDigivolutionCardFilter: { faceDown: true },
          actions: [{ kind: "Digivolve", target: { filter: { useTriggerSource: true } }, payCost: false }],
        },
      ],
    });
  });

  it("publicly resolves its Security Main, adds a DM card, and places itself in the battle area", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT26-099", as: "manual", faceUp: true }],
        deck: [{ card: "BT26-048", as: "dm" }, { card: "BT1-009", as: "rest" }, { card: "BT1-010", as: "rest2" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("manual"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-099"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-048");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-099");
  });
});
