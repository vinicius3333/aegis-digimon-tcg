import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";
import { compiled } from "#api/cards/SD03/SD03-02";

const cardId = "SD03-02";
const greenAlysionTamer = "BD06-09";
const greenVegetation = "BT1-065";
const redAlysion = "BD01-02";
const alysionHost = "BD06-05";
const vanilla = "BT1-009";

type DeckEntry = { card: string; as: string };

async function playGemmonOver(deck: readonly DeckEntry[]) {
  const s = setupEngine({ 0: { hand: [{ card: cardId, as: "gemmon" }], deck: [...deck] } }, { autoSelectCards: true });
  s.state.memory = 3;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gemmon").instanceId })).toEqual({ ok: true });
  return s;
}

describe("SD03-02 Gemmon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD03",
      nameEn: "Gemmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      types: ["Mythical Beast", "ALYSION"],
      effectText:
        "[On Play] Reveal the top 5 cards of your deck. Add 1 green card with the [ALYSION] trait among them to the hand. Return the rest to the bottom of your deck.",
      inheritedEffectText: "[All Turns] This suspended Digimon with the [ALYSION] trait gets +1000 DP.",
    });
  });

  it("compiles the green ALYSION reveal and the inherited suspended ALYSION aura", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 5,
            add: [
              {
                filter: { colors: ["Green"], nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
                count: 1,
                to: "hand",
              },
            ],
            rest: "deckBottom",
          },
        ],
      },
      {
        trigger: "AllTurns",
        isInherited: true,
        actions: [{ kind: "Aura", target: { isSelf: true }, effect: { kind: "modifyDP", amount: 1000 } }],
      },
    ]);
  });

  it("adds a green ALYSION Tamer and bottoms the red ALYSION and green non-ALYSION cards", async () => {
    const s = await playGemmonOver([
      { card: redAlysion, as: "redAlysion" },
      { card: greenVegetation, as: "greenVegetation" },
      { card: greenAlysionTamer, as: "greenAlysionTamer" },
      { card: vanilla, as: "fourth" },
      { card: vanilla, as: "fifth" },
      { card: alysionHost, as: "sixth" },
    ]);
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greenAlysionTamer").instanceId),
    );
    await drainMicrotasks(20);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("greenAlysionTamer").instanceId]);
    const deckIds = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(deckIds).toHaveLength(5);
    expect(deckIds[0]).toBe(s.inst("sixth").instanceId);
    expect(deckIds.slice(1)).toEqual(
      expect.arrayContaining(
        ["redAlysion", "greenVegetation", "fourth", "fifth"].map((alias) => s.inst(alias).instanceId),
      ),
    );
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("adds nothing and bottoms all five when no green ALYSION card is revealed", async () => {
    const s = await playGemmonOver([
      { card: redAlysion, as: "redAlysion" },
      { card: greenVegetation, as: "greenVegetation" },
      { card: vanilla, as: "third" },
      { card: vanilla, as: "fourth" },
      { card: vanilla, as: "fifth" },
      { card: alysionHost, as: "sixth" },
    ]);
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    await drainMicrotasks(30);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)[0]).toBe(s.inst("sixth").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(6);
  });

  it("gives +1000 DP only to a suspended ALYSION host, on either player's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: alysionHost, as: "suspendedAlysion", suspended: true, under: [cardId] },
          { card: alysionHost, as: "activeAlysion", under: [cardId] },
          { card: greenVegetation, as: "suspendedVegetation", suspended: true, under: [cardId] },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("suspendedAlysion").currentDP).toBe(8000);
    expect(s.perm("activeAlysion").currentDP).toBe(7000);
    expect(s.perm("suspendedVegetation").currentDP).toBe(4000);

    await advance(s.engine).verb.suspend([s.perm("activeAlysion").permanentId]);
    expect(s.perm("activeAlysion").currentDP).toBe(8000);
  });
});
