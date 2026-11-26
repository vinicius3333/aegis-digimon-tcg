import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import type { Seat } from "@aegis/shared";
import "../index.js";

const cardId = "BD02-01";
const alysionHost = "BD02-04";
const tenkomon = "BD02-03";
const vanillaBlueLevel5 = "BT1-038";
const source = "BT1-028";
const deckCard = "BT1-009";

type TrashParams = {
  host: PermanentSpec;
  victimSeat?: Seat;
  byEffectSeat?: Seat;
  times?: number;
};

async function handAfterTrashing({ host, victimSeat = 1, byEffectSeat = 0, times = 1 }: TrashParams) {
  const victim: PermanentSpec = { card: vanillaBlueLevel5, as: "victim", under: [source, source, source] };
  const s = setupEngine({
    0: { battleArea: victimSeat === 0 ? [host, victim] : [host], deck: [deckCard, deckCard, deckCard] },
    1: { battleArea: victimSeat === 1 ? [victim] : [], deck: [deckCard, deckCard] },
  });
  await s.ready();
  const handBefore = s.state.players[0]!.hand.length;
  for (let round = 0; round < times; round += 1) {
    const victimPermanent = s.perm("victim");
    await advance(s.engine).verb.trashDigivolutionCards(
      victimPermanent.permanentId,
      [victimPermanent.stack[0]!.instanceId],
      byEffectSeat,
    );
    await drainMicrotasks(40);
  }
  return { s, drawn: s.state.players[0]!.hand.length - handBefore };
}

describe("BD02-01 Viximon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD02",
      nameEn: "Viximon",
      colors: ["Blue"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser", "ALYSION"],
      rarity: "U",
      inheritedEffectText:
        "[All Turns][Once Per Turn] When effects trash your opponent's Digimon's digivolution cards, if this Digimon has the [ALYSION] trait, ＜Draw 1＞ . (Draw 1 card from your deck.)",
    });
    expect(getCardDefinition(cardId)!.effectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("draws 1 when your effect trashes an opposing Digimon's digivolution card under an ALYSION host", async () => {
    const { drawn } = await handAfterTrashing({ host: { card: alysionHost, as: "host", under: [cardId] } });

    expect(drawn).toBe(1);
  });

  it("also draws when the opponent's own effect trashes their Digimon's digivolution cards", async () => {
    const { drawn } = await handAfterTrashing({
      host: { card: alysionHost, as: "host", under: [cardId] },
      byEffectSeat: 1,
    });

    expect(drawn).toBe(1);
  });

  it("does not draw when the host lacks the ALYSION trait", async () => {
    const { drawn } = await handAfterTrashing({ host: { card: vanillaBlueLevel5, as: "host", under: [cardId] } });

    expect(drawn).toBe(0);
  });

  it("does not draw when the digivolution cards are not trashed by an effect", async () => {
    const victim: PermanentSpec = { card: vanillaBlueLevel5, as: "victim", under: [source] };
    const s = setupEngine({
      0: { battleArea: [{ card: alysionHost, as: "host", under: [cardId] }], deck: [deckCard, deckCard] },
      1: { battleArea: [victim] },
    });
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("victim").permanentId, [
      s.perm("victim").stack[0]!.instanceId,
    ]);
    await drainMicrotasks(40);

    expect(s.state.players[0]!.hand.length - handBefore).toBe(0);
  });

  it("does not draw when your own Digimon's digivolution cards are trashed", async () => {
    const { drawn } = await handAfterTrashing({
      host: { card: alysionHost, as: "host", under: [cardId] },
      victimSeat: 0,
    });

    expect(drawn).toBe(0);
  });

  it("does nothing while Viximon is the top card", async () => {
    const { drawn } = await handAfterTrashing({ host: { card: cardId, as: "host" } });

    expect(drawn).toBe(0);
  });

  it("draws only once per turn", async () => {
    const { drawn } = await handAfterTrashing({
      host: { card: alysionHost, as: "host", under: [cardId] },
      times: 2,
    });

    expect(drawn).toBe(1);
  });

  it("draws when an inherited Tenkomon trashes a digivolution card on attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: alysionHost, as: "host", under: [cardId, tenkomon] }],
          deck: [deckCard, deckCard],
        },
        1: {
          battleArea: [{ card: vanillaBlueLevel5, as: "victim", under: [source, source] }],
          security: [deckCard, deckCard, deckCard],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);

    expect(s.perm("victim").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.length - handBefore).toBe(1);
  });
});
