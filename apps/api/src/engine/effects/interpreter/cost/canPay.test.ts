import { describe, expect, it } from "vitest";
import { getCardDefinition, type Cost, type Target } from "@aegis/shared";
import { setupEngine, type SeatSpec } from "../../../testkit/harness.js";
import { buildEffectContext, cardSourceOf } from "../../../gameEngine/effectContext.js";
import { canPayCost } from "./canPay.js";
import "../../../../cards/index.js";

const SOURCE = "BT1-010";
const OTHER = "BT1-011";
const LEVEL_THREE = "BT1-009";
const TAMER = "BT1-085";
const OPTION = "BT1-090";

async function contextFor(seat: SeatSpec, opponent: SeatSpec = {}, looseSource = false) {
  const s = setupEngine(
    { 0: { deck: ["BT1-012"], ...seat }, 1: { deck: ["BT1-012"], ...opponent } },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const source = cardSourceOf(s.engine as never, looseSource ? s.inst("source") : s.perm("source").topCard!);
  return buildEffectContext(s.engine as never, source, { effectKey: "test" } as never, {} as never);
}

const namedSuspended = (cardId: string): Target => ({
  filter: {
    controller: "mine",
    nameOrTrait: [{ tokens: [getCardDefinition(cardId)!.nameEn], match: "nameExact" }],
    suspended: true,
  },
  count: 1,
});

describe("canPayCost for kinds that used to count as always payable", () => {
  describe("flipSecurity (BT23-043)", () => {
    const cost: Cost = { kind: "flipSecurity" };

    it("needs a face-up security card", async () => {
      const ctx = await contextFor({
        battleArea: [{ card: SOURCE, as: "source" }],
        security: [{ card: OTHER, faceUp: true }],
      });
      expect(canPayCost(ctx, cost)).toBe(true);
    });

    it("is unpayable with only face-down security cards", async () => {
      const ctx = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }], security: 2 });
      expect(canPayCost(ctx, cost)).toBe(false);
    });
  });

  describe("placeAsSecurity (BT19-048, BT26-033)", () => {
    const selfCost: Cost = {
      kind: "placeAsSecurity",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      position: "faceUpBottom",
    };
    const digivolutionTopCost: Cost = { ...selfCost, fromDigivolutionTop: true };

    it("is payable while the source permanent is in play", async () => {
      const ctx = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(ctx, selfCost)).toBe(true);
    });

    it("needs a digivolution card when it places the card beneath the top", async () => {
      const bare = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(bare, digivolutionTopCost)).toBe(false);

      const stacked = await contextFor({ battleArea: [{ card: SOURCE, as: "source", under: [LEVEL_THREE] }] });
      expect(canPayCost(stacked, digivolutionTopCost)).toBe(true);
    });
  });

  describe("playFromDigivolutionCards (BT19-102)", () => {
    const cost: Cost = {
      kind: "playFromDigivolutionCards",
      hostTarget: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      target: { filter: { kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 },
    };

    it("needs a host holding a matching digivolution card", async () => {
      const ctx = await contextFor({ battleArea: [{ card: SOURCE, as: "source", under: [LEVEL_THREE] }] });
      expect(canPayCost(ctx, cost)).toBe(true);
    });

    it("is unpayable when no host has digivolution cards", async () => {
      const ctx = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(ctx, cost)).toBe(false);
    });

    it("defers to payment while the chosen host is not bound yet", async () => {
      const ctx = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      const boundHostCost: Cost = { ...cost, hostTarget: { fromSelectionRef: "chosenHost", filter: {}, count: 1 } };
      expect(canPayCost(ctx, boundHostCost)).toBe(true);

      ctx.selections = new Map([["chosenHost", ctx.source.permanent()!.permanentId]]);
      expect(canPayCost(ctx, boundHostCost)).toBe(false);
    });
  });

  describe("unsuspendNamed (BT19-090)", () => {
    const cost = (...cardIds: string[]): Cost => ({ kind: "unsuspendNamed", targets: cardIds.map(namedSuspended) });

    it("needs one suspended permanent per named requirement", async () => {
      const ctx = await contextFor({
        battleArea: [
          { card: SOURCE, as: "source", suspended: true },
          { card: OTHER, suspended: true },
        ],
      });
      expect(canPayCost(ctx, cost(SOURCE, OTHER))).toBe(true);
    });

    it("is unpayable when a named permanent is active", async () => {
      const ctx = await contextFor({
        battleArea: [{ card: SOURCE, as: "source", suspended: true }, { card: OTHER }],
      });
      expect(canPayCost(ctx, cost(SOURCE, OTHER))).toBe(false);
    });

    it("cannot count one permanent for two requirements", async () => {
      const ctx = await contextFor({ battleArea: [{ card: SOURCE, as: "source", suspended: true }] });
      expect(canPayCost(ctx, cost(SOURCE, SOURCE))).toBe(false);
    });

    it("is unpayable with no requirements", async () => {
      const ctx = await contextFor({ battleArea: [{ card: SOURCE, as: "source", suspended: true }] });
      expect(canPayCost(ctx, cost())).toBe(false);
    });
  });

  describe("trash", () => {
    const deckCost: Cost = { kind: "trash", target: { filter: { zone: "deck", controller: "mine" }, count: 2 } };

    it("from the deck needs enough deck cards (P-011)", async () => {
      const full = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }], deck: [OTHER, OTHER] });
      expect(canPayCost(full, deckCost)).toBe(true);

      const short = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }], deck: [OTHER] });
      expect(canPayCost(short, deckCost)).toBe(false);
    });

    it("without a target defers to payment, which reads the card from the printed text (EX1-071)", async () => {
      const ctx = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(ctx, { kind: "trash" })).toBe(true);
    });

    it("of any of your Digimon's link cards needs a linked card (BT25-073)", async () => {
      const cost: Cost = {
        kind: "trash",
        target: { filter: { controller: "mine", kind: ["Digimon"], zone: "linked" }, count: 1 },
      };
      const linked = await contextFor({
        battleArea: [
          { card: SOURCE, as: "source" },
          { card: OTHER, linked: [LEVEL_THREE] },
        ],
      });
      expect(canPayCost(linked, cost)).toBe(true);

      const bare = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }, OTHER] });
      expect(canPayCost(bare, cost)).toBe(false);
    });

    it("of this Digimon's link cards ignores other hosts (BT21-073)", async () => {
      const cost: Cost = { kind: "trash", target: { filter: { isSelfRef: true, zone: "linked" }, count: 1 } };
      const own = await contextFor({ battleArea: [{ card: SOURCE, as: "source", linked: [LEVEL_THREE] }] });
      expect(canPayCost(own, cost)).toBe(true);

      const other = await contextFor({
        battleArea: [
          { card: SOURCE, as: "source" },
          { card: OTHER, linked: [LEVEL_THREE] },
        ],
      });
      expect(canPayCost(other, cost)).toBe(false);
    });

    it("from any of your Digimon's digivolution cards needs the full count (EX10-036)", async () => {
      const cost: Cost = {
        kind: "trash",
        target: { filter: { controller: "mine" }, count: 3, from: ["digivolutionCards"] },
      };
      const enough = await contextFor({
        battleArea: [
          { card: SOURCE, as: "source", under: [LEVEL_THREE, LEVEL_THREE] },
          { card: OTHER, under: [LEVEL_THREE] },
        ],
      });
      expect(canPayCost(enough, cost)).toBe(true);

      const short = await contextFor({ battleArea: [{ card: SOURCE, as: "source", under: [LEVEL_THREE] }, OTHER] });
      expect(canPayCost(short, cost)).toBe(false);
    });

    it("of up to N digivolution cards needs its minimum (EX10-033)", async () => {
      const cost: Cost = {
        kind: "trash",
        target: { filter: { controller: "mine" }, count: 3, upTo: true, minimum: 1, from: ["digivolutionCards"] },
      };
      const one = await contextFor({ battleArea: [{ card: SOURCE, as: "source", under: [LEVEL_THREE] }] });
      expect(canPayCost(one, cost)).toBe(true);

      const none = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(none, cost)).toBe(false);
    });

    it("from your hand or digivolution cards counts both zones (EX13-031)", async () => {
      const cost: Cost = {
        kind: "trash",
        target: { filter: { controller: "mine", zone: ["hand", "digivolutionCards"] }, count: 1 },
      };
      const inHand = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }], hand: [OTHER] });
      expect(canPayCost(inHand, cost)).toBe(true);

      const stacked = await contextFor({ battleArea: [{ card: SOURCE, as: "source", under: [LEVEL_THREE] }] });
      expect(canPayCost(stacked, cost)).toBe(true);

      const empty = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(empty, cost)).toBe(false);
    });

    it("of this Digimon's digivolution cards read from `from` needs one of them", async () => {
      const cost: Cost = {
        kind: "trash",
        target: { filter: { isSelfRef: true }, count: 1, from: ["digivolutionCards"] },
      };
      const stacked = await contextFor({ battleArea: [{ card: SOURCE, as: "source", under: [LEVEL_THREE] }] });
      expect(canPayCost(stacked, cost)).toBe(true);

      const bare = await contextFor({
        battleArea: [
          { card: SOURCE, as: "source" },
          { card: OTHER, under: [OTHER] },
        ],
      });
      expect(canPayCost(bare, cost)).toBe(false);
    });

    it("from a bound host's digivolution cards defers until the host is bound", async () => {
      const cost: Cost = {
        kind: "trash",
        target: { filter: { boundTo: "thatDigimon" } as Target["filter"], count: 1, from: ["digivolutionCards"] },
      };
      const ctx = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(ctx, cost)).toBe(true);

      ctx.selections = new Map([["thatDigimon", ctx.source.permanent()!.permanentId]]);
      expect(canPayCost(ctx, cost)).toBe(false);
    });

    it("from your hand named only in the printed text needs a hand card", async () => {
      const cost: Cost = {
        kind: "trash",
        target: { filter: { controller: "mine" }, count: 1 },
        raw: "By trashing 1 card in your hand",
      };
      const held = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }], hand: [OTHER] });
      expect(canPayCost(held, cost)).toBe(true);

      const empty = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(empty, cost)).toBe(false);
    });

    it("of this card is payable while the source is a loose card (ST22-10)", async () => {
      const cost: Cost = { kind: "trash", target: { filter: { isSelfRef: true }, count: 1 } };
      const ctx = await contextFor({ hand: [{ card: SOURCE, as: "source" }] }, {}, true);
      expect(canPayCost(ctx, cost)).toBe(true);
    });

    it("of an Option in the battle area needs one there (BT23-055)", async () => {
      const cost: Cost = {
        kind: "trash",
        target: {
          filter: { zone: "battleArea", controller: "mine", kind: ["Option"], placedInBattleAreaByEffect: true },
          count: 1,
        },
      };
      const placed = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }, OPTION] });
      expect(canPayCost(placed, cost)).toBe(true);

      const none = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(none, cost)).toBe(false);
    });
  });

  describe("return", () => {
    it("without a target defers to payment", async () => {
      const ctx = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(ctx, { kind: "return" })).toBe(true);
    });

    it("of a security card needs one (BT26-016)", async () => {
      const cost: Cost = {
        kind: "return",
        target: { filter: { zone: "security", controllerDefault: "mine", position: "top" }, count: 1 },
        to: "deckBottom",
      };
      const guarded = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }], security: 1 });
      expect(canPayCost(guarded, cost)).toBe(true);

      const open = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }], security: 0 });
      expect(canPayCost(open, cost)).toBe(false);
    });

    it("of a battle-area Tamer needs one (BT26-092)", async () => {
      const cost: Cost = {
        kind: "return",
        target: { filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"] }, count: 1 },
        to: "deckBottom",
      };
      const withTamer = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }, TAMER] });
      expect(canPayCost(withTamer, cost)).toBe(true);

      const withoutTamer = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(withoutTamer, cost)).toBe(false);
    });

    it("from a trash named only in the printed text reads the trash, not the board", async () => {
      const cost: Cost = {
        kind: "return",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        raw: "By returning 1 Digimon card from your trash to the bottom of the deck",
      };
      const inTrash = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }], trash: [OTHER] });
      expect(canPayCost(inTrash, cost)).toBe(true);

      const onBoardOnly = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
      expect(canPayCost(onBoardOnly, cost)).toBe(false);
    });
  });
});
