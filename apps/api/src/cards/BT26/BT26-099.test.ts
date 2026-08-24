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
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      { kind: "RevealAdd", revealCount: 3, rest: "deckBottom" },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    expect(card?.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          addedDigivolutionCardFilter: { faceDown: true },
          actions: [{ kind: "Digivolve", target: { sourceRef: "triggerSubject" }, payCost: false }],
        },
      ],
    });
  });

  it("publicly resolves its Security Main, adds a DM card, and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT26-099", as: "manual", faceUp: true }],
          deck: [
            { card: "BT26-048", as: "dm" },
            { card: "BT1-009", as: "rest" },
            { card: "BT1-010", as: "rest2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("manual"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-099"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-048");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-099");
  });

  it("consumes Delay on a later turn and evolves the Digimon that received a face-down card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-064", as: "host", under: [{ card: "BT1-009", as: "faceDown", faceUp: false }] }],
          hand: [{ card: "BT26-099", as: "manual" }],
          deck: [
            { card: "BT26-077", as: "reapermon" },
            { card: "BT1-001", as: "rest" },
            { card: "BT1-002", as: "rest2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("manual").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-099"));
    s.perm("manual").enterFieldTurnCount = -1;
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-077");

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("faceDown").instanceId],
    });

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-099");
    expect(s.perm("host").topCard.cardId).toBe("BT26-077");
  });
});
