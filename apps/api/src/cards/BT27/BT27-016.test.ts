import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { compiled } from "./BT27-016.js";
import "#api/cards/index";

const cardId = "BT27-016";
const DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-019"];
const OPPONENT_SECURITY = [
  { card: "BT1-013", as: "securityTop" },
  { card: "BT1-014", as: "securityBottom" },
];
const OPPONENT_FIELD = [
  { card: "BT1-009", as: "lowest" },
  { card: "BT1-019", as: "higher", suspended: true },
];

type BoardOptions = {
  sources?: string[];
  allies?: { card: string; as: string }[];
  opponentField?: { card: string; as: string }[];
  accept?: boolean;
  preferInstanceIds?: string[];
};

function jesmonBoard({
  sources = [],
  allies = [],
  opponentField = OPPONENT_FIELD,
  accept = true,
  preferInstanceIds = [],
}: BoardOptions) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT6-016", as: "base", under: sources }, ...allies],
        hand: [{ card: cardId, as: "card" }],
        deck: DECK,
      },
      1: { battleArea: opponentField, security: OPPONENT_SECURITY, deck: DECK },
    },
    {
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds,
      ...(accept ? { autoAcceptOptional: true } : { autoDeclineOptional: true }),
    },
  );
  s.state.memory = 10;
  return s;
}

async function digivolve(s: ReturnType<typeof setupEngine>) {
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("card").instanceId,
      useAlternateCost: true,
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision);
}

function opponentSecurityIds(s: ReturnType<typeof setupEngine>) {
  return s.state.players[1]!.security.map((card) => card.instanceId);
}

describe("Jesmon (X Antibody) and Ultimate Seibaken", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Jesmon (X Antibody)",
      nameJp: "ジエスモンX抗体/究極戦刃聖覇剣",
      colors: ["Red"],
      kinds: ["Digimon", "Option"],
      level: 6,
      playCost: 5,
      dp: 12000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "X Antibody", "Royal Knight"],
      rarity: "SR",
      isDualCard: true,
      dualEffect: "Ultimate Seibaken",
      optionColorRequirements: ["White"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((effect) => [effect.trigger, effect.frequency ?? null])).toEqual([
      ["Static", null],
      ["Static", null],
      ["WhenDigivolving", "OncePerTurn"],
      ["WhenAttacking", "OncePerTurn"],
      ["Main", null],
    ]);
  });

  it("digivolves from Jesmon for 1 and gains Progress, Piercing, and Engage", async () => {
    const s = jesmonBoard({ accept: false });
    await s.ready();
    await digivolve(s);
    expect(s.state.memory).toBe(9);
    expect(s.perm("base").topCard.cardId).toBe(cardId);
    for (const keyword of ["Progress", "Piercing", "Engage"]) {
      expect(observe(s.engine).hasKeyword(s.perm("base"), keyword)).toBe(true);
    }
  });

  it("rejects the alternate route from a level 6 that is not Jesmon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-019", as: "base" }], hand: [{ card: cardId, as: "card" }], deck: DECK },
    });
    s.state.memory = 10;
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

  it("When Digivolving gains 6000 DP and returns another Digimon to activate the Option side", async () => {
    const preferInstanceIds: string[] = [];
    const s = jesmonBoard({ allies: [{ card: "BT2-056", as: "ally" }], preferInstanceIds });
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    const [top, bottom] = opponentSecurityIds(s);
    const lowest = s.perm("lowest").topCard.instanceId;
    await s.ready();
    await digivolve(s);

    expect(s.perm("base").currentDP).toBe(18000);
    const player = s.state.players[0]!;
    expect(player.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([cardId]);
    expect(player.deck.at(-1)!.cardId).toBe("BT2-056");

    const opponent = s.state.players[1]!;
    expect(opponent.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-019"]);
    expect(opponentSecurityIds(s)).toEqual([bottom, lowest]);
    expect(opponent.security.at(-1)!.faceUp).not.toBe(true);
    expect(opponent.trash.map((card) => card.instanceId)).toEqual([top]);
  });

  it("offers your other Digimon and matching digivolution cards in one card choice", async () => {
    const preferInstanceIds: string[] = [];
    const s = jesmonBoard({ sources: ["BT9-109"], allies: [{ card: "BT2-056", as: "ally" }], preferInstanceIds });
    const ally = s.perm("ally").topCard.instanceId;
    const xAntibody = s.perm("base").stack[0]!.instanceId;
    preferInstanceIds.push(xAntibody);
    await s.ready();
    await digivolve(s);

    const costChoices = s.decisions.filter(({ req }) => req.kind === "selectCards" && req.options?.purpose === "cost");
    expect(costChoices).toHaveLength(1);
    expect(costChoices[0]!.req.options?.candidateInstanceIds).toEqual(expect.arrayContaining([ally, xAntibody]));
    expect(s.decisions.some(({ req }) => req.kind === "chooseOption")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(xAntibody);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-019"]);
  });

  it.each([
    ["Jesmon", "BT6-016"],
    ["X Antibody", "BT9-109"],
  ])("returns a [%s] digivolution card to the deck bottom to activate the Option side", async (_label, source) => {
    const preferInstanceIds: string[] = [];
    const s = jesmonBoard({ sources: [source], preferInstanceIds });
    preferInstanceIds.push(s.perm("base").stack[0]!.instanceId);
    await s.ready();
    await digivolve(s);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT6-016"]);
    expect(s.state.players[0]!.deck.at(-1)!.cardId).toBe(source);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-019"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
  });

  it("keeps the DP gain without activating the Option side when nothing can be returned", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-020", as: "base" }], hand: [{ card: cardId, as: "card" }], deck: DECK },
        1: { battleArea: OPPONENT_FIELD, security: OPPONENT_SECURITY, deck: DECK },
      },
      { autoSelectCards: true, autoChooseOption: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision);
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").currentDP).toBe(18000);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-020"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("asks the return in the card choice itself and keeps the DP gain when it is declined", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-016", as: "base" },
          { card: "BT2-056", as: "ally" },
        ],
        hand: [{ card: cardId, as: "card" }],
        deck: DECK,
      },
      1: { battleArea: OPPONENT_FIELD, security: OPPONENT_SECURITY, deck: DECK },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);
    const picker = s.decisions.at(-1)!.req;
    expect(picker).toMatchObject({ kind: "selectCards", options: { purpose: "cost", min: 0, declinesCost: true } });
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: picker.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("base").currentDP).toBe(18000);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("When Attacking shares the once-per-turn use with When Digivolving", async () => {
    const s = jesmonBoard({ sources: ["BT9-109", "BT6-016"] });
    await s.ready();
    await digivolve(s);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT6-016", "BT6-016"]);
    const deckAfterDigivolving = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("higher").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.state.pendingDecision);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT6-016", "BT6-016"]);
    expect(s.state.players[0]!.deck).toHaveLength(deckAfterDigivolving);
  });

  it("When Attacking activates the Option side on a turn it did not digivolve", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "jesmon", under: ["BT9-109"] }], deck: DECK },
        1: { battleArea: OPPONENT_FIELD, security: OPPONENT_SECURITY, deck: DECK },
      },
      { autoSelectCards: true, autoChooseOption: true, autoAcceptOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jesmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("higher").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.state.pendingDecision);
    expect(s.state.players[0]!.deck.at(-1)!.cardId).toBe("BT9-109");
    expect(s.state.players[1]!.security.at(-1)!.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-013");
  });

  it.each([
    ["a Huckmon text Digimon", "BT13-009", true],
    ["a Jesmon without Huckmon in its text", "BT6-016", false],
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

  async function useOption(opponentField: { card: string; as: string }[]) {
    const s = setupEngine(
      {
        0: { battleArea: ["BT13-009"], hand: [{ card: cardId, as: "card" }], deck: DECK },
        1: { battleArea: opponentField, security: OPPONENT_SECURITY, deck: DECK },
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

  it("Main places the opponent's lowest DP Digimon under their security and trashes the top card", async () => {
    const opponent = await useOption(OPPONENT_FIELD);
    expect(opponent.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-019"]);
    expect(opponent.security.map((card) => card.cardId)).toEqual(["BT1-014", "BT1-009"]);
    expect(opponent.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
  });

  it("Main trashes no security card when the opponent has no Digimon to place", async () => {
    const opponent = await useOption([]);
    expect(opponent.security.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(opponent.trash).toHaveLength(0);
  });
});
