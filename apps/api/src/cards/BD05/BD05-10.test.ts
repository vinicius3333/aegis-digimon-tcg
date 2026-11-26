import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { drainMicrotasks, settle, setupEngine, type PermanentSpec } from "#api/engine/testkit/harness";
import "#api/cards/index";

const cardId = "BD05-10";
const musyamon = "BD05-06";
const mukuro = "BD05-09";
const vanillaPurpleLevel3 = "BT2-067";
const vanillaPurpleLevel4 = "BT3-083";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel4 = "BT1-014";
const vanillaRedLevel5 = "BT1-020";

type UseParams = { battleArea: PermanentSpec[]; opponent?: PermanentSpec[] };

async function useFromHand({ battleArea, opponent = [] }: UseParams) {
  const s = setupEngine(
    { 0: { battleArea, hand: [{ card: cardId, as: "option" }] }, 1: { battleArea: opponent } },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId));
  await settle(() => s.state.pendingDecision === undefined);
  await drainMicrotasks(40);
  return s;
}

function boardIds(s: ReturnType<typeof setupEngine>, seat: 0 | 1) {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard!.cardId);
}

describe("BD05-10 Warrior's Sword Flash", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD05",
      nameEn: "Warrior's Sword Flash",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 8,
      effectText:
        "When this card would be used, if you have no Digimon other than 1 [Wizard] trait Digimon, reduce the use cost by 3.\n[Main] Delete 1 of your opponent's Digimon with the lowest level.",
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("costs 3 less while your only Digimon is a [Wizard] trait Digimon, regardless of Tamers", async () => {
    const s = await useFromHand({
      battleArea: [
        { card: musyamon, as: "musyamon" },
        { card: mukuro, as: "mukuro" },
      ],
    });

    expect(s.state.memory).toBe(5);
  });

  it("keeps its full cost with a second Digimon or without a [Wizard] trait Digimon", async () => {
    const twoDigimon = await useFromHand({
      battleArea: [
        { card: musyamon, as: "musyamon" },
        { card: vanillaPurpleLevel3, as: "other" },
      ],
    });
    expect(twoDigimon.state.memory).toBe(2);

    const nonWizard = await useFromHand({ battleArea: [{ card: vanillaPurpleLevel4, as: "nonWizard" }] });
    expect(nonWizard.state.memory).toBe(2);
  });

  it("deletes the opponent's lowest level Digimon", async () => {
    const s = await useFromHand({
      battleArea: [{ card: musyamon, as: "musyamon" }],
      opponent: [
        { card: vanillaRedLevel5, as: "levelFive" },
        { card: vanillaRedLevel3, as: "levelThree" },
        { card: vanillaRedLevel4, as: "levelFour" },
      ],
    });

    expect(boardIds(s, 1)).toEqual([vanillaRedLevel5, vanillaRedLevel4]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([vanillaRedLevel3]);
    expect(boardIds(s, 0)).toEqual([musyamon]);
  });

  it("activates its [Main] effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "option" }] },
        1: {
          battleArea: [
            { card: vanillaRedLevel5, as: "attacker" },
            { card: vanillaRedLevel4, as: "levelFour" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId), 5000);
    await drainMicrotasks(40);

    expect(boardIds(s, 1)).toEqual([vanillaRedLevel5]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([vanillaRedLevel4]);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
