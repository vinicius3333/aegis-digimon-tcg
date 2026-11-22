import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { compiled } from "./BT27-005.js";
import "#api/cards/index";

const cardId = "BT27-005";
const DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-019"];

function boardWithMotimonUnder(hand: { card: string; as: string }[]) {
  return {
    0: { battleArea: [{ card: "BT10-062", as: "host", under: [cardId] }], hand, deck: DECK },
    1: { deck: DECK },
  };
}

describe("Motimon inherited draw when black Digimon are played", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Motimon",
      nameJp: "モチモン",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText: "[Your Turn] [Once Per Turn] When any of your black Digimon are played, ＜Draw 1＞.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((effect) => [effect.trigger, effect.isInherited, effect.frequency])).toEqual([
      ["YourTurn", true, "OncePerTurn"],
    ]);
  });

  it.each([
    ["a black Digimon", "BT2-056", 1],
    ["a red Digimon", "BT1-013", 0],
  ])("draws when you play %s", async (_label, card, draws) => {
    const s = setupEngine(boardWithMotimonUnder([{ card, as: "played" }]));
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.hand).toHaveLength(draws);
    expect(s.state.players[0]!.deck).toHaveLength(DECK.length - draws);
  });

  it("draws only once per turn", async () => {
    const s = setupEngine(
      boardWithMotimonUnder([
        { card: "BT2-056", as: "first" },
        { card: "BT10-062", as: "second" },
      ]),
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.deck).toHaveLength(DECK.length - 1);
  });

  it("does not draw while Motimon is only in the breeding area", async () => {
    const s = setupEngine({
      0: { breeding: { card: cardId, as: "egg" }, hand: [{ card: "BT2-056", as: "played" }], deck: DECK },
      1: { deck: DECK },
    });
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.deck).toHaveLength(DECK.length);
  });
});
