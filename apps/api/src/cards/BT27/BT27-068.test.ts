import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { compiled } from "./BT27-068.js";
import "#api/cards/index";

const cardId = "BT27-068";
const DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-019"];

async function deleteByOpponent(s: ReturnType<typeof setupEngine>, aliases: string[]) {
  advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
  const removed = await advance(s.engine).verb.deletePermanent(
    aliases.map((alias) => s.perm(alias).permanentId),
    "byEffect",
  );
  advance(s.engine).verb.leaveEffectResolution();
  await settle(() => !s.state.pendingDecision);
  return removed;
}

describe("Gankoomon (X Antibody) and Ultimate Sengi Tengyouken", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Gankoomon (X Antibody)",
      nameJp: "ガンクゥモンX抗体/究極戦技天仰拳",
      colors: ["Black", "White"],
      kinds: ["Digimon", "Option"],
      level: 6,
      playCost: 5,
      dp: 13000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      types: ["Holy Warrior", "X Antibody", "Royal Knight"],
      dualEffect: "Ultimate Sengi Tengyouken",
      optionColorRequirements: ["White"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((effect) => [effect.trigger, effect.frequency ?? null])).toEqual([
      ["Static", null],
      ["Static", null],
      ["AllTurns", null],
      ["AllTurns", "OncePerTurn"],
      ["Main", null],
    ]);
  });

  function digivolveOnto(base: string) {
    const s = setupEngine(
      { 0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: cardId, as: "card" }], deck: DECK } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    return s;
  }

  it("digivolves from Gankoomon for 2 and gains its keywords", async () => {
    const s = digivolveOnto("BT20-057");
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").topCard.cardId).toBe(cardId);
    for (const keyword of ["Collision", "Reboot", "Blocker"]) {
      expect(observe(s.engine).hasKeyword(s.perm("base"), keyword)).toBe(true);
    }
  });

  it("rejects the alternate route from a level 6 that is not Gankoomon", async () => {
    const s = digivolveOnto("BT2-064");
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(10);
  });

  it.each([
    ["a Huckmon text Digimon", "BT13-009", true],
    ["a Gankoomon without Huckmon in its text", "BT13-019", false],
  ])("uses the Option side with %s on the field", async (_label, ally, usable) => {
    const s = setupEngine(
      { 0: { battleArea: [ally], hand: [{ card: cardId, as: "card" }], deck: DECK }, 1: { deck: DECK } },
      { autoSelectCards: true, autoDeclineOptional: true, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId, useAs: "digimon" }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId, useAs: "option" }).ok,
    ).toBe(usable);
    await settle();
    expect(s.state.memory).toBe(usable ? 5 : 10);
  });

  async function useOptionAgainst(big: string) {
    const s = setupEngine(
      {
        0: { battleArea: ["BT13-009"], hand: [{ card: cardId, as: "card" }], deck: DECK },
        1: {
          battleArea: [
            { card: big, as: "big" },
            { card: "BT2-056", as: "cheap" },
          ],
          deck: DECK,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision);
    return s.state.players[1]!;
  }

  it("Main returns a 12000 DP Digimon to the top of the deck and deletes nothing", async () => {
    const opponent = await useOptionAgainst("BT2-064");
    expect(opponent.deck[0]!.cardId).toBe("BT2-064");
    expect(opponent.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT2-056"]);
    expect(opponent.trash).toHaveLength(0);
  });

  it("Main deletes the lowest play cost Digimon when none has 12000 DP", async () => {
    const opponent = await useOptionAgainst("BT10-065");
    expect(opponent.trash.map((card) => card.cardId)).toEqual(["BT2-056"]);
    expect(opponent.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT10-065"]);
  });

  it("returns another Digimon to the deck bottom to stay", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gankoomon", under: ["BT13-009"] },
            { card: "BT2-056", as: "ally" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    await s.ready();
    expect(await deleteByOpponent(s, ["gankoomon"])).toBe(0);
    const player = s.state.players[0]!;
    expect(player.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([cardId]);
    expect(player.deck.at(-1)!.cardId).toBe("BT2-056");
  });

  it("offers your other Digimon and matching digivolution cards in one card choice to stay", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gankoomon", under: ["BT9-109"] },
            { card: "BT2-056", as: "ally" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    const ally = s.perm("ally").topCard.instanceId;
    const xAntibody = s.perm("gankoomon").stack[0]!.instanceId;
    preferInstanceIds.push(xAntibody);
    await s.ready();
    expect(await deleteByOpponent(s, ["gankoomon"])).toBe(0);
    const costChoices = s.decisions.filter(({ req }) => req.kind === "selectCards" && req.options?.purpose === "cost");
    expect(costChoices).toHaveLength(1);
    expect(costChoices[0]!.req.options?.candidateInstanceIds).toEqual(expect.arrayContaining([ally, xAntibody]));
    expect(s.decisions.some(({ req }) => req.kind === "chooseOption")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(xAntibody);
  });

  it("leaves when the return is declined in the card choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gankoomon", under: ["BT9-109"] },
            { card: "BT2-056", as: "ally" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    const removal = advance(s.engine).verb.deletePermanent([s.perm("gankoomon").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision !== undefined);
    const picker = s.decisions.at(-1)!.req;
    expect(picker).toMatchObject({ kind: "selectCards", options: { purpose: "cost", min: 0, declinesCost: true } });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: picker.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    expect(await removal).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT2-056"]);
  });

  it.each(["BT20-057", "BT9-109"])("returns a %s digivolution card to the deck bottom to stay", async (source) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "gankoomon", under: [source] }], deck: DECK },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(await deleteByOpponent(s, ["gankoomon"])).toBe(0);
    expect(s.perm("gankoomon").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.at(-1)!.cardId).toBe(source);
  });

  it("leaves when it has no other Digimon and no matching digivolution card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "gankoomon", under: ["BT13-009"] }], deck: DECK },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(await deleteByOpponent(s, ["gankoomon"])).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("activates the Option side once per turn when your Digimon leave the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gankoomon" },
            { card: "BT2-056", as: "first" },
            { card: "BT10-062", as: "second" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [
            { card: "BT2-064", as: "firstBig" },
            { card: "BT2-064", as: "secondBig" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(await deleteByOpponent(s, ["first"])).toBe(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck[0]!.cardId).toBe("BT2-064");

    expect(await deleteByOpponent(s, ["second"])).toBe(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not activate the Option side when an opponent's Digimon leaves", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "gankoomon" }], deck: DECK },
        1: {
          battleArea: [
            { card: "BT2-056", as: "leaving" },
            { card: "BT2-064", as: "big" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("leaving").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT2-064"]);
  });

  it("highlights each Option clause while its target is chosen", async () => {
    const returnText = "[Main] Return 1 of your opponent's 12000 DP or higher Digimon to the top of the deck.";
    const deleteText = "If this effect didn't return, delete 1 of your opponent's lowest play cost Digimon.";
    const prompts = async (opponentField: string[]) => {
      const s = setupEngine(
        {
          0: { battleArea: ["BT13-009"], hand: [{ card: cardId, as: "card" }], deck: DECK },
          1: { battleArea: opponentField, deck: DECK },
        },
        { autoSelectCards: true, autoDeclineOptional: true, declinePrompts: ["Arts Digivolve"] },
      );
      await s.ready();
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId, useAs: "option" }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.pendingDecision);
      return s.decisions.map(({ req }) => req.options).filter((options) => options?.timing === "Main");
    };
    expect(await prompts(["BT2-064", "BT10-055"])).toContainEqual(
      expect.objectContaining({ effectTextEmphasis: returnText }),
    );
    expect(await prompts(["BT2-056", "BT2-056"])).toContainEqual(
      expect.objectContaining({ effectTextEmphasis: deleteText }),
    );
  });
});

describe("Gankoomon (X Antibody) official rulings", () => {
  it("does not activate the Option side when Gankoomon itself leaves", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "gankoomon" }], deck: DECK },
        1: { battleArea: [{ card: "BT2-064", as: "big" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(await deleteByOpponent(s, ["gankoomon"])).toBe(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT2-064"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(DECK);
  });

  it.each([
    ["a Digimon whose name contains Huckmon", "BT6-011"],
    ["a Digimon with Huckmon only in its effect text", "BT20-057"],
  ])("counts %s as a card with Huckmon in its text", async (_label, ally) => {
    const s = setupEngine(
      { 0: { battleArea: [ally], hand: [{ card: cardId, as: "card" }], deck: DECK }, 1: { deck: DECK } },
      { autoSelectCards: true, autoDeclineOptional: true, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(5);
  });

  it("treats the activated Option side effect as an Option effect against Digimon-effect immunity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gankoomon" },
            { card: "BT2-056", as: "ally" },
          ],
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT15-047", as: "immune", suspended: true }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(await deleteByOpponent(s, ["ally"])).toBe(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT15-047"]);
  });

  it("does not count activating the Option side as using an Option card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gankoomon" },
            { card: "BT1-009", under: ["P-046"] },
            { card: "BT2-056", as: "ally" },
          ],
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT2-064", as: "big" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(await deleteByOpponent(s, ["ally"])).toBe(1);
    expect(s.state.players[1]!.deck[0]!.cardId).toBe("BT2-064");
    expect(s.state.memory).toBe(3);
    expect(s.perm("gankoomon").topCard.cardId).toBe(cardId);
  });

  it("counts as a Royal Knight trait Option card for King Drasil", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-104", as: "tamer" }],
          hand: [{ card: cardId, as: "option" }],
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT2-064", as: "big" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();
    s.state.memory = 4;
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("tamer"));
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([cardId]);
    expect(s.state.players[1]!.deck[0]!.cardId).toBe("BT2-064");
  });

  it("stays by returning your own token even though the token leaves the game instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "gankoomon" },
            { card: "TOKEN-Diaboromon-Token", as: "token" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(await deleteByOpponent(s, ["gankoomon"])).toBe(0);
    const player = s.state.players[0]!;
    expect(player.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([cardId]);
    expect(player.deck.map((card) => card.cardId)).toEqual(DECK);
    expect(player.trash).toHaveLength(0);
  });

  it("chooses an opponent's 12000 DP Digimon that can't be returned and then deletes the lowest play cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT13-009"], hand: [{ card: cardId, as: "card" }], deck: DECK },
        1: {
          battleArea: [
            { card: "BT11-060", as: "protected", dp: 12000 },
            { card: "BT1-009", as: "cheap" },
          ],
          deck: DECK,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision);
    const opponent = s.state.players[1]!;
    expect(opponent.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT11-060"]);
    expect(opponent.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(opponent.deck.map((card) => card.cardId)).toEqual(DECK);
  });

  it("lets each copy's leave prevention interrupt only once while the first deletion resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "first" },
            { card: cardId, as: "second" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const first = s.perm("first").topCard.instanceId;
    const second = s.perm("second").topCard.instanceId;
    await deleteByOpponent(s, ["first"]);
    const player = s.state.players[0]!;
    expect(player.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([second]);
    expect(player.deck.at(-1)!.instanceId).toBe(first);
    expect(player.trash).toHaveLength(0);
  });
});
