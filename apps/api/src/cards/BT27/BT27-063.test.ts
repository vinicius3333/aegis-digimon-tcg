import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { compiled } from "./BT27-063.js";
import "#api/cards/index";

const cardId = "BT27-063";
const DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-019"];
const ALLY_BLOCKER = "BT5-061";
const NON_BLOCKER = "BT10-064";

function andromonBoard(allies: { card: string; as: string }[], andromonSuspended = false) {
  return {
    0: {
      battleArea: [{ card: cardId, as: "andromon", suspended: andromonSuspended }, ...allies],
      deck: DECK,
    },
    1: { battleArea: [{ card: "BT1-019", as: "rival", under: ["BT1-009"] }], deck: DECK },
  };
}

async function deleteBy(s: ReturnType<typeof setupEngine>, seat: 0 | 1, aliases: string[]) {
  advance(s.engine).verb.enterEffectResolution(seat, ["Digimon"]);
  const removed = await advance(s.engine).verb.deletePermanent(
    aliases.map((alias) => s.perm(alias).permanentId),
    "byEffect",
  );
  advance(s.engine).verb.leaveEffectResolution();
  await settle(() => !s.state.pendingDecision);
  return removed;
}

describe("Andromon suspend De-Digivolve, Blocker leave prevention, and inherited Blocker play", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Andromon",
      nameJp: "アンドロモン",
      colors: ["Black"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
    });
    expect(compiled.coverage).toBe("full");
    expect(
      compiled.effects.map((effect) => [effect.trigger, effect.frequency ?? null, effect.isInherited ?? false]),
    ).toEqual([
      ["Static", null, false],
      ["AllTurns", "OncePerTurn", false],
      ["AllTurns", null, false],
      ["OpponentsTurn", "OncePerTurn", true],
    ]);
  });

  it("has ＜Blocker＞", async () => {
    const s = setupEngine(andromonBoard([]));
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("andromon"), "Blocker")).toBe(true);
  });

  it("De-Digivolves 1 of the opponent's Digimon when it suspends, once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "andromon" }], deck: DECK },
        1: { battleArea: [{ card: "BT1-019", as: "rival", under: ["BT1-009", "BT1-013"] }], deck: DECK },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("andromon").permanentId]);
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("rival").topCard.cardId).toBe("BT1-013");

    await advance(s.engine).verb.unsuspend([s.perm("andromon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("andromon").permanentId]);
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("rival").topCard.cardId).toBe("BT1-013");
  });

  it("suspends to keep an ally ＜Blocker＞ from leaving by the opponent's effect, which also De-Digivolves", async () => {
    const s = setupEngine(andromonBoard([{ card: ALLY_BLOCKER, as: "ally" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    await s.ready();
    expect(await deleteBy(s, 1, ["ally"])).toBe(0);
    expect(s.perm("ally").topCard.cardId).toBe(ALLY_BLOCKER);
    expect(s.perm("andromon").isSuspended).toBe(true);
    expect(s.perm("rival").topCard.cardId).toBe("BT1-009");
  });

  it("can keep itself from leaving because it has ＜Blocker＞", async () => {
    const s = setupEngine(andromonBoard([]), { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    expect(await deleteBy(s, 1, ["andromon"])).toBe(0);
    expect(s.perm("andromon").isSuspended).toBe(true);
  });

  it("keeps only 1 of two ＜Blocker＞ Digimon that would leave together", async () => {
    const s = setupEngine(
      andromonBoard([
        { card: ALLY_BLOCKER, as: "first" },
        { card: ALLY_BLOCKER, as: "second" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await deleteBy(s, 1, ["first", "second"])).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([ALLY_BLOCKER]);
  });

  it("prevents a battle deletion, since only your own effects are excluded", async () => {
    const s = setupEngine(andromonBoard([{ card: ALLY_BLOCKER, as: "ally" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("ally").permanentId], "byBattle")).toBe(0);
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("andromon").isSuspended).toBe(true);
  });

  it.each([
    ["your own effect deletes the Blocker", 0, ALLY_BLOCKER, false, 1],
    ["the leaving Digimon has no ＜Blocker＞", 1, NON_BLOCKER, false, 1],
    ["Andromon is already suspended", 1, ALLY_BLOCKER, true, 1],
    ["you decline", 1, ALLY_BLOCKER, false, 1],
  ] as const)("lets the Digimon leave when %s", async (label, seat, ally, suspended, removed) => {
    const s = setupEngine(
      andromonBoard([{ card: ally, as: "ally" }], suspended),
      label === "you decline" ? { autoDeclineOptional: true } : { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await deleteBy(s, seat, ["ally"])).toBe(removed);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([ally]);
  });

  it.each([
    ["a level 5 black Digimon with ＜Blocker＞", "BT2-061", true],
    ["a level 3 black Digimon with ＜Blocker＞", "BT5-061", true],
    ["a level 6 black Digimon with ＜Blocker＞", "BT2-065", false],
    ["a red Digimon with ＜Blocker＞", "BT14-011", false],
    ["a black Digimon without ＜Blocker＞", "BT10-064", false],
  ])(
    "inherited: plays %s from hand for free when your Digimon suspend on the opponent's turn",
    async (_label, card, played) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT10-062", as: "host", under: [cardId] }],
            hand: [{ card, as: "reward" }],
            deck: DECK,
          },
          1: { deck: DECK },
        },
        { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
      );
      await s.ready();
      s.state.turnSeat = 1;
      s.state.memory = -3;
      await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
      await settle(() => !s.state.pendingDecision);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === card)).toBe(played);
      expect(s.state.memory).toBe(-3);
    },
  );

  it("inherited play does not fire on your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-062", as: "host", under: [cardId] }],
          hand: [{ card: "BT2-061", as: "reward" }],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT2-061"]);
  });
});
