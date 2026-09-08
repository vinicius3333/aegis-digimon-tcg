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
      expect(effect.actions?.[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckTopOrBottom",
        add: [
          {
            count: 1,
            to: "play",
            optional: true,
            filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Machine", "Cyborg", "TS"], match: "trait" }] },
          },
        ],
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

  it("publicly plays a cost-5 Machine candidate from the reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-063", as: "locomon" }],
          deck: [
            { card: "BT24-058", as: "machine" },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-058"));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("machine").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("miss1").instanceId,
      s.inst("miss2").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
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
    await settle(() => s.events.some((event) => event.kind === "effectResolved"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-063"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("does not play a matching trait card above the play-cost-5 boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-063", as: "locomon" }],
          deck: [
            { card: "BT24-022", as: "tooExpensive" },
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
    await settle(() => s.events.some((event) => event.kind === "effectResolved"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-063"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("tooExpensive").instanceId,
      s.inst("miss1").instanceId,
      s.inst("miss2").instanceId,
    ]);
  });

  it("publicly refuses the optional revealed play and returns all cards to the deck", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-063", as: "locomon" }],
          deck: [
            { card: "BT24-010", as: "candidate" },
            { card: "BT1-009", as: "miss1" },
            { card: "BT1-010", as: "miss2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("locomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const refusal = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: refusal.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-063"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("candidate").instanceId,
      s.inst("miss1").instanceId,
      s.inst("miss2").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
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
            { card: "BT1-015", as: "bonusDraw" },
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
    const baseId = s.inst("base").instanceId;
    const locomonId = s.inst("locomon").instanceId;

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
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.perm("base").topCard.instanceId).toBe(locomonId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
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

  it.each([
    ["main", { card: "BT24-063", as: "locomon" }],
    ["inherited", { card: "BT10-028", as: "host", under: ["BT24-063"] }],
  ])("public %s Collision grants the opponent Blocker and forces a block", async (_label, attacker) => {
    const s = setupEngine({
      0: { battleArea: [attacker], deck: ["BT1-015", "BT1-016"] },
      1: {
        battleArea: [{ card: "BT1-009", as: "blocker", dp: 2000 }],
        security: [{ card: "BT1-011", as: "security" }],
        deck: ["BT1-015", "BT1-016"],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    const attackerId = s.state.players[0]!.battleArea[0]!.permanentId;
    const blockerId = s.perm("blocker").permanentId;
    const securityId = s.inst("security").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [blockerId],
    });
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toMatchObject({ ok: false });
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("blocker").instanceId);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });
});
