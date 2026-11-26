import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

const cardId = "BD01-09";
const vanillaRedLevel3 = "BT1-009";
const vanillaGreenLevel4 = "BT1-071";
const vanillaGreenLevel5 = "ST4-09";

function buildDecks() {
  return Array.from({ length: 6 }, () => vanillaRedLevel3);
}

type BoardParams = { opponentSuspended: readonly boolean[]; ownSuspended?: number; turnSeat?: 0 | 1 };

async function boardWithLillymonUnderHost({ opponentSuspended, ownSuspended = 0, turnSeat = 0 }: BoardParams) {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: vanillaGreenLevel5, as: "host", under: [cardId] },
        ...Array.from({ length: ownSuspended }, (_, index) => ({
          card: vanillaRedLevel3,
          as: `own${index}`,
          suspended: true,
        })),
      ],
    },
    1: {
      battleArea: opponentSuspended.map((suspended, index) => ({
        card: vanillaRedLevel3,
        as: `opponent${index}`,
        suspended,
      })),
    },
  });
  s.state.turnSeat = turnSeat;
  await s.ready();
  return s;
}

describe("BD01-09 Lillymon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD01",
      nameEn: "Lillymon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Fairy"],
      rarity: "C",
      effectText: "[When Digivolving] 1 of your opponent's Digimon can't unsuspend until their turn ends.",
      inheritedEffectText:
        "[All Turns] While your opponent has 2 or more suspended Digimon, this Digimon gets +2000 DP.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("digivolves from a green level 4 Digimon for 3 memory and keeps 1 opposing Digimon suspended through their turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: vanillaGreenLevel4, as: "base" }],
          hand: [{ card: cardId, as: "lillymon" }],
          deck: buildDecks(),
        },
        1: {
          battleArea: [
            { card: vanillaRedLevel3, as: "locked", suspended: true },
            { card: vanillaRedLevel3, as: "free", suspended: true },
          ],
          deck: buildDecks(),
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("locked").topCard.instanceId);
    s.state.memory = 5;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lillymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("locked"), "unsuspend"));

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([vanillaGreenLevel4]);
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).isRestricted(s.perm("free"), "unsuspend")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);

    expect(s.perm("locked").isSuspended).toBe(true);
    expect(s.perm("free").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(false);
    assertNoLoudGap(s);
  });

  it("gives its host +2000 DP while the opponent has exactly 2 suspended Digimon", async () => {
    const s = await boardWithLillymonUnderHost({ opponentSuspended: [true, true] });

    expect(s.perm("host").currentDP).toBe(7000 + 2000);
    assertNoLoudGap(s);
  });

  it("keeps the +2000 DP during the opponent's turn", async () => {
    const s = await boardWithLillymonUnderHost({ opponentSuspended: [true, true], turnSeat: 1 });

    expect(s.perm("host").currentDP).toBe(7000 + 2000);
  });

  it("gives nothing while the opponent has only 1 suspended Digimon", async () => {
    const s = await boardWithLillymonUnderHost({ opponentSuspended: [true, false] });

    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not count your own suspended Digimon", async () => {
    const s = await boardWithLillymonUnderHost({ opponentSuspended: [true], ownSuspended: 2 });

    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not apply while Lillymon itself is the top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "lillymon", under: [vanillaGreenLevel4] }] },
      1: {
        battleArea: [
          { card: vanillaRedLevel3, suspended: true },
          { card: vanillaRedLevel3, suspended: true },
        ],
      },
    });
    await s.ready();

    expect(s.perm("lillymon").currentDP).toBe(6000);
  });

  it("recomputes the +2000 DP when a second opposing Digimon becomes suspended", async () => {
    const s = await boardWithLillymonUnderHost({ opponentSuspended: [true, false] });
    expect(s.perm("host").currentDP).toBe(7000);

    await advance(s.engine).verb.suspend([s.perm("opponent1").permanentId]);
    await settle(() => s.perm("host").currentDP === 9000);

    expect(s.perm("host").currentDP).toBe(7000 + 2000);
  });
});
