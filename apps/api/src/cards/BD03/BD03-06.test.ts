import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "BD03-06";
const garurumonHost = "ST2-11";
const nonGarurumonHost = "ST1-10";
const blackLevel4 = "BT10-062";
const redLevel4 = "BT2-014";
const deckCards = ["BT1-009", "BT1-013", "BT1-014", "BT1-028", "BT1-045"];

async function boardWithInheritedHost(host: string, turnSeat: 0 | 1) {
  const s = setupEngine({ 0: { battleArea: [{ card: host, as: "host", under: [cardId] }] } });
  s.state.turnSeat = turnSeat;
  await s.ready();
  return s;
}

describe("BD03-06 WereGarurumon: Sagittarius Mode", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD03",
      nameEn: "WereGarurumon: Sagittarius Mode",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 6000,
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 3 },
        { color: "Red", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Beastkin"],
      rarity: "C",
      effectText:
        "＜Jamming＞ (This Digimon can't be deleted in battles against Security Digimon.)\n[When Digivolving] Reveal the top 4 cards of your deck. Return them to the top of your deck.",
      inheritedEffectText:
        "[Opponent's Turn] This Digimon with [Garurumon] in its name gains ＜Blocker＞ .(This Digimon can block in the blocker timing.)",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it.each([
    ["black", blackLevel4],
    ["red", redLevel4],
  ])(
    "digivolves from a %s level 4 Digimon for 3 memory and reveals the top 4 cards back to the top",
    async (_color, base) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: cardId, as: "sagittarius" }], deck: deckCards },
        },
        { autoOrderCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      const deckBefore = s.state.players[0]!.deck.map((card) => card.instanceId);

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("sagittarius").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId && s.state.pendingDecision === undefined);
      await settle();

      expect(s.state.memory).toBe(2);
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
      const revealed = s.events.filter((event) => event.kind === "cardRevealed").map((event) => event.cardId);
      expect(revealed).toEqual(deckCards.slice(1, 5));
      const deckAfter = s.state.players[0]!.deck.map((card) => card.instanceId);
      expect(deckAfter).toHaveLength(4);
      expect(s.state.players[0]!.deck.every((card) => card.faceUp !== true)).toBe(true);
      expect([...deckAfter].sort()).toEqual([...deckBefore.slice(1)].sort());
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([deckBefore[0]]);
      expect(s.state.players[0]!.trash).toHaveLength(0);
    },
  );

  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "sagittarius" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("sagittarius"), "Jamming")).toBe(true);
  });

  it("gives a Garurumon host Blocker on the opponent's turn", async () => {
    const s = await boardWithInheritedHost(garurumonHost, 1);

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("gives no Blocker on your own turn", async () => {
    const s = await boardWithInheritedHost(garurumonHost, 0);

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
  });

  it("gives no Blocker to a host without Garurumon in its name", async () => {
    const s = await boardWithInheritedHost(nonGarurumonHost, 1);

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
  });
});
