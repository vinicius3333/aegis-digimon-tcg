import { describe, expect, it } from "vitest";
import { getCardDefinition, type Cost, type Target } from "@aegis/shared";
import { setupEngine, type SeatSpec } from "../../../testkit/harness.js";
import { buildEffectContext, cardSourceOf } from "../../../gameEngine/effectContext.js";
import { canPayCost } from "./canPay.js";
import "../../../../cards/index.js";

const SOURCE = "BT1-010";
const OTHER = "BT1-011";
const LEVEL_THREE = "BT1-009";

async function contextFor(seat: SeatSpec, opponent: SeatSpec = {}) {
  const s = setupEngine(
    { 0: { deck: ["BT1-012"], ...seat }, 1: { deck: ["BT1-012"], ...opponent } },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const source = cardSourceOf(s.engine as never, s.perm("source").topCard!);
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
  });

  it("return without a target defers to payment", async () => {
    const ctx = await contextFor({ battleArea: [{ card: SOURCE, as: "source" }] });
    expect(canPayCost(ctx, { kind: "return" })).toBe(true);
  });
});
