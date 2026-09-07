import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_063 } from "./BT24-063.js";
import "../index.js";

describe("BT24-063 Locomon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-063")).toMatchObject({
      cardId: "BT24-063",
      nameEn: "Locomon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Machine", "Iliad", "TS"],
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
    });
  });

  it("has the same play-from-reveal search on play and digivolving", () => {
    const effects = BT24_063.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" });
      expect((effect.actions?.[0] as any).add?.[0]).toMatchObject({
        count: 1,
        to: "play",
        optional: true,
        filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Machine", "Cyborg", "TS"], match: "trait" }] },
      });
    }
  });

  it("plays a cost-5-or-lower TS Tamer from the reveal and returns the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-063", as: "locomon" }],
          deck: [
            { card: "BT24-083", as: "tamer" },
            { card: "BT1-009", as: "miss1" },
            { card: "BT1-010", as: "miss2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("locomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("accepts an explicit bottom-order decision after selecting the matching reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-063", as: "locomon" }],
          deck: [
            { card: "BT1-012", as: "openingFiller" },
            { card: "BT24-083", as: "matchingTamer" },
            { card: "BT1-009", as: "restFirst" },
            { card: "BT1-010", as: "restSecond" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        autoOrderCards: false,
        preferOptionIndex: 1,
      },
    );
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("locomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const orderDecision = s.decisions.at(-1)!.req;
    expect(orderDecision.kind).toBe("orderCards");
    expect(orderDecision.options?.orderDestination).toBe("deckBottom");
    expect(orderDecision.options?.visibleCards).toEqual(
      expect.arrayContaining([
        { instanceId: s.inst("openingFiller").instanceId, cardId: "BT1-012" },
        { instanceId: s.inst("restFirst").instanceId, cardId: "BT1-009" },
      ]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision.decisionId,
        response: {
          kind: "orderCards",
          order: [s.inst("restFirst").instanceId, s.inst("openingFiller").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("matchingTamer").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("restSecond").instanceId,
      s.inst("restFirst").instanceId,
      s.inst("openingFiller").instanceId,
    ]);
  });

  it("does not play when the three revealed cards contain no qualifying card", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT24-063", as: "locomon" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("locomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-063"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it.each([
    ["normal black level-4 requirement", "BT10-062", false],
    ["alternate TS level-4 requirement", "BT24-046", true],
  ])("uses the %s for cost 3 and resolves the reveal", async (_label, baseCard, useAlternateCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "BT24-063", as: "locomon" }],
          deck: [
            { card: "BT24-083", as: "tamer" },
            { card: "BT1-009", as: "miss1" },
            { card: "BT1-010", as: "miss2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("locomon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("locomon").instanceId);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.memory).toBe(2);
  });

  it("exposes Collision both as a main and inherited keyword", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-063", as: "locomon" },
          { card: "BT24-064", as: "host", under: ["BT24-063"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("locomon"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Collision")).toBe(true);
  });
});
