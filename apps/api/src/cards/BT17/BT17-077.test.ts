import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-077.js";
import "./index.js";

describe("BT17-077 Imperialdramon: Paladin Mode", () => {
  it("trashes all opponent digivolution cards on play and when digivolving", () => {
    for (const effect of [compiled.effects?.[1], compiled.effects?.[2]]) {
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: "all",
        target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"] } },
      });
    }
  });

  it("lets the activating player choose whose entire Trash returns to the bottom of the deck", () => {
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "Modal",
      choose: 1,
      options: [
        [
          {
            kind: "Return",
            to: "deckBottom",
            bindResultAs: "returnedTrashCards",
            target: { count: "all", filter: { zone: "trash", controller: "mine" } },
          },
        ],
        [
          {
            kind: "Return",
            to: "deckBottom",
            bindResultAs: "returnedTrashCards",
            target: { count: "all", filter: { zone: "trash", controller: "opponent" } },
          },
        ],
      ],
    });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({
      kind: "GainMemory",
      amount: 3,
      condition: {
        kind: "bindingContains",
        ref: "returnedTrashCards",
        filter: { kind: ["Digimon"], colors: ["White"], levelComparison: { op: "eq", value: 7 } },
      },
    });
  });

  it("unsuspends by returning an opponent Digimon with no digivolution cards", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: { isSelf: true },
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "return",
            to: "deckBottom",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" } },
          },
        },
      ],
    });
  });

  it("trashes every opposing digivolution card after a natural non-DNA play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-077", as: "paladin" }] },
        1: {
          battleArea: [
            { card: "BT17-063", under: [{ card: "BT1-009", as: "firstSource" }], as: "firstTarget" },
            { card: "BT17-063", under: [{ card: "BT1-010", as: "secondSource" }], as: "survivor" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 9;
    const firstSourceId = s.inst("firstSource").instanceId;
    const secondSourceId = s.inst("secondSource").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paladin").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === secondSourceId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === firstSourceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === secondSourceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("firstTarget").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("survivor").instanceId)).toBe(
      true,
    );
  });

  it("unsuspends after a natural attack returns a bare opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-077", as: "paladin" }] },
        1: { battleArea: [{ card: "BT17-063", as: "bareTarget" }], security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paladin").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("bareTarget").instanceId));

    expect(s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("bareTarget").instanceId)).toBe(true);
    expect(s.perm("paladin").isSuspended).toBe(false);
  });

  it("matches the catalog printed text, colors, evolution costs and the [Imperialdramon]-in-name route", () => {
    expect(getCardDefinition("BT17-077")).toMatchObject({
      cardId: "BT17-077",
      nameEn: "Imperialdramon: Paladin Mode",
      colors: ["White", "Blue", "Green"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 9,
      dp: 16000,
      types: ["Ancient Holy Warrior", "Free"],
      evoCosts: [
        { color: "Blue", level: 6, memoryCost: 6 },
        { color: "Green", level: 6, memoryCost: 6 },
      ],
    });
    const printed = getCardDefinition("BT17-077")!.effectText!;
    expect(printed).toContain("[Digivolve]Lv.6 w/[Imperialdramon] in its name: Cost 5");
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, names: ["Imperialdramon"], cost: 5, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("digivolves from a Lv6 Imperialdramon through the printed route for 5 and draws once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-032", under: [{ card: "BT1-009", as: "base" }], as: "impLv6" }],
          hand: [{ card: "BT17-077", as: "paladin" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: {},
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    const paladinId = s.inst("paladin").instanceId;
    const baseId = s.inst("base").instanceId;
    const impTopId = s.perm("impLv6").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impLv6").permanentId,
        instanceId: paladinId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === paladinId));

    const paladin = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === paladinId)!;
    expect(paladin.stack.map((card) => card.instanceId)).toEqual([baseId, impTopId]);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("refuses the digivolve from a Lv6 whose name is not Imperialdramon and whose color is off", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-025", as: "wargreymon" }],
          hand: [{ card: "BT17-077", as: "paladin" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: {},
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    const paladinId = s.inst("paladin").instanceId;
    const sourceId = s.perm("wargreymon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wargreymon").permanentId,
        instanceId: paladinId,
        useAlternateCost: true,
      }),
    ).not.toEqual({ ok: true });

    expect(s.perm("wargreymon").topCard.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([paladinId]);
    expect(s.state.memory).toBe(9);
  });

  it("returns your own trash to the deck bottom and gains 3 for a multicolor white Lv7, per Q4711/Q2848", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-032", under: [{ card: "BT1-009", as: "base" }], as: "impLv6" }],
          hand: [{ card: "BT17-077", as: "paladin" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
          trash: [
            { card: "BT12-112", as: "shoutmon" },
            { card: "BT1-014", as: "redFour" },
          ],
        },
        1: {
          battleArea: [{ card: "BT17-063", under: [{ card: "BT1-011", as: "victimSource" }], as: "victim" }],
          trash: [{ card: "BT1-012", as: "oppTrash" }],
        },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    const paladinId = s.inst("paladin").instanceId;
    const shoutmonId = s.inst("shoutmon").instanceId;
    const redFourId = s.inst("redFour").instanceId;
    const victimSourceId = s.inst("victimSource").instanceId;
    const oppTrashId = s.inst("oppTrash").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impLv6").permanentId,
        instanceId: paladinId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === shoutmonId));

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(victimSourceId);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("victim").instanceId)).toBe(true);
    const myDeckIds = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(myDeckIds).toContain(shoutmonId);
    expect(myDeckIds).toContain(redFourId);
    expect(s.state.players[0]!.trash.some((card) => [shoutmonId, redFourId].includes(card.instanceId))).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === oppTrashId)).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("gains only 3 memory when the returned trash holds two white Lv7 cards, per Q2849", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-032", under: [{ card: "BT1-009", as: "base" }], as: "impLv6" }],
          hand: [{ card: "BT17-077", as: "paladin" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
          trash: [
            { card: "BT12-112", as: "shoutmon" },
            { card: "BT1-084", as: "omni" },
          ],
        },
        1: {},
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    const paladinId = s.inst("paladin").instanceId;
    const shoutmonId = s.inst("shoutmon").instanceId;
    const omniId = s.inst("omni").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impLv6").permanentId,
        instanceId: paladinId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === shoutmonId));

    const myDeckIds = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(myDeckIds).toContain(shoutmonId);
    expect(myDeckIds).toContain(omniId);
    expect(s.state.memory).toBe(7);
  });

  it("returns the opponent's trash instead when the second option is chosen, per Q4711", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-032", under: [{ card: "BT1-009", as: "base" }], as: "impLv6" }],
          hand: [{ card: "BT17-077", as: "paladin" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
          trash: [{ card: "BT1-013", as: "myTrash" }],
        },
        1: {
          trash: [{ card: "BT1-084", as: "oppWhiteSeven" }],
        },
      },
      { preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    const paladinId = s.inst("paladin").instanceId;
    const myTrashId = s.inst("myTrash").instanceId;
    const oppWhiteSevenId = s.inst("oppWhiteSeven").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impLv6").permanentId,
        instanceId: paladinId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === oppWhiteSevenId));

    expect(s.state.players[1]!.deck.some((card) => card.instanceId === oppWhiteSevenId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === oppWhiteSevenId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(myTrashId);
    expect(s.state.memory).toBe(7);
  });
});
