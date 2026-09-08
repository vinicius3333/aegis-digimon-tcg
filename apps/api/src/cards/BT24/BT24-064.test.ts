import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_064 } from "./BT24-064.js";
import "../index.js";

describe("BT24-064 Ouryumon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-064")).toMatchObject({
      cardId: "BT24-064",
      nameEn: "Ouryumon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Beast Dragon", "X Antibody", "DigiPolice", "SEEKERS"],
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
    });
  });

  it("models the All Turns De-Digivolve trigger when any Digimon or Tamer suspends", () => {
    const allTurns = BT24_064.effects?.find((entry) => entry.trigger === "AllTurns");
    const subTrigger = allTurns?.actions?.[0] as any;
    expect(subTrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { kind: ["Digimon", "Tamer"] },
    });
    expect(subTrigger.sourceFilter.controllerDefault).toBeUndefined();
    expect(subTrigger.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 2 });
  });

  it("has Piercing and Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-064", as: "ouryumon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("ouryumon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("ouryumon"))).toBe(true);
  });

  it("publicly uses Piercing against a weaker suspended Digimon and survives the security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-064", as: "ouryumon" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", suspended: true }],
          security: [{ card: "BT1-009", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const victimId = s.perm("victim").permanentId;
    const victimCardId = s.inst("victim").instanceId;
    const securityId = s.inst("security").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ouryumon").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(victimCardId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-064")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(securityId);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("publicly blocks an opponent attack with Ouryumon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-064", as: "ouryumon" }], security: [{ card: "BT1-009", as: "security" }] },
        1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attackerId = s.perm("attacker").permanentId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("ouryumon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.perm("ouryumon").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("attacker").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("ouryumon").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
  });

  it.each([
    ["normal black level-5 requirement", "BT10-064", false, 4],
    ["normal green level-5 requirement", "BT1-075", false, 4],
    ["alternate DigiPolice/SEEKERS requirement", "BT24-060", true, 3],
  ])(
    "uses the %s and plays a revealed cost-7 DigiPolice card",
    async (_label, baseCard, useAlternateCost, expectedCost) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: baseCard, as: "base" }],
            hand: [{ card: "BT24-064", as: "ouryumon" }],
            deck: [
              { card: "BT1-009", as: "bonusDraw" },
              { card: "BT24-060", as: "played" },
              { card: "BT1-013", as: "miss1" },
              { card: "BT1-015", as: "miss2" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      const sourceId = s.perm("base").topCard.instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("ouryumon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === s.inst("ouryumon").instanceId);
      await settle(() =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("played").instanceId,
        ),
      );

      expect(s.state.memory).toBe(5 - expectedCost);
      expect(s.perm("base").topCard.instanceId).toBe(s.inst("ouryumon").instanceId);
      expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("played").instanceId)).toBe(
        true,
      );
    },
  );

  it.each([
    ["deck top", 0, ["restFirst", "restSecond", "untouched"]],
    ["deck bottom", 1, ["untouched", "restFirst", "restSecond"]],
  ])(
    "public digivolution explicitly orders remaining revealed cards to the %s",
    async (_label, optionIndex, expectedOrder) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT10-064", as: "base" }],
            hand: [{ card: "BT24-064", as: "ouryumon" }],
            deck: [
              { card: "BT1-009", as: "bonusDraw" },
              { card: "BT24-060", as: "played" },
              { card: "BT1-013", as: "restFirst" },
              { card: "BT1-015", as: "restSecond" },
              { card: "BT1-016", as: "untouched" },
            ],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
          autoOrderCards: false,
          preferOptionIndex: optionIndex,
        },
      );
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("ouryumon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderCards");
      const orderDecision = s.decisions.at(-1)!.req;
      expect(orderDecision.kind).toBe("orderCards");
      expect(orderDecision.options?.orderDestination).toBe(optionIndex === 0 ? "deckTop" : "deckBottom");
      expect(orderDecision.options?.visibleCards).toEqual(
        expect.arrayContaining([
          { instanceId: s.inst("restFirst").instanceId, cardId: "BT1-013" },
          { instanceId: s.inst("restSecond").instanceId, cardId: "BT1-015" },
        ]),
      );
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: orderDecision.decisionId,
          response: {
            kind: "orderCards",
            order: [s.inst("restFirst").instanceId, s.inst("restSecond").instanceId],
          },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.deck.length === 3);

      expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
        expectedOrder.map((label) => s.inst(label).instanceId),
      );
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("played").instanceId)).toBe(
        true,
      );
    },
  );

  it("publicly proves same-turn suppression and opponent-turn reset", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-064", as: "ouryumon" }],
          hand: [{ card: "BT24-050", as: "unsuspend" }],
          security: [{ card: "BT1-009", as: "ownSecurity" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            {
              card: "BT24-051",
              as: "first",
              under: [
                { card: "BT24-046", as: "firstLv4" },
                { card: "BT24-050", as: "firstLv5" },
              ],
            },
            {
              card: "BT24-051",
              as: "second",
              under: [
                { card: "BT24-046", as: "secondLv4" },
                { card: "BT24-050", as: "secondLv5" },
              ],
            },
            { card: "BT1-020", as: "attacker", dp: 6000 },
          ],
          security: [
            { card: "BT1-009", as: "security1" },
            { card: "BT1-013", as: "security2" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").topCard.instanceId, s.perm("second").topCard.instanceId);
    const firstId = s.inst("first").instanceId;
    const firstLv5Id = s.inst("firstLv5").instanceId;
    const firstLv4Id = s.inst("firstLv4").instanceId;
    const secondId = s.inst("second").instanceId;
    const secondLv5Id = s.inst("secondLv5").instanceId;
    const secondLv4Id = s.inst("secondLv4").instanceId;
    const security1Id = s.inst("security1").instanceId;
    const security2Id = s.inst("security2").instanceId;
    const ownSecurityId = s.inst("ownSecurity").instanceId;
    s.state.memory = 10;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ouryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").topCard.cardId === "BT24-046" && !observe(s.engine).isAttacking());
    expect(s.perm("first").topCard.cardId).toBe("BT24-046");
    expect(s.perm("first").topCard.instanceId).toBe(firstLv4Id);
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([firstId, firstLv5Id]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(security1Id);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([security2Id]);

    preferred.splice(0, preferred.length, s.perm("ouryumon").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspend").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("ouryumon").isSuspended);
    expect(s.state.memory).toBe(3);

    preferred.splice(0, preferred.length, s.perm("second").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ouryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("second").topCard.instanceId).toBe(secondId);
    expect(s.perm("second").stack.map((card) => card.instanceId)).toEqual([secondLv4Id, secondLv5Id]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(security2Id);
    expect(s.state.players[1]!.security).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    preferred.splice(0, preferred.length, s.perm("second").topCard.instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("second").topCard.instanceId).toBe(secondLv4Id);
    expect(s.perm("second").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([secondId, secondLv5Id, security2Id]),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(ownSecurityId);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("resets the suspension trigger on the owner's later turn after a public attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-064", as: "ouryumon" }],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017", "BT1-018"],
        },
        1: {
          battleArea: [
            {
              card: "BT24-051",
              as: "first",
              under: [
                { card: "BT24-046", as: "firstLv4" },
                { card: "BT24-050", as: "firstLv5" },
              ],
            },
            {
              card: "BT24-051",
              as: "second",
              under: [
                { card: "BT24-046", as: "secondLv4" },
                { card: "BT24-050", as: "secondLv5" },
              ],
            },
          ],
          security: [
            { card: "BT1-013", as: "security1" },
            { card: "BT1-015", as: "security2" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").topCard.instanceId);
    const firstId = s.inst("first").instanceId;
    const firstLv5Id = s.inst("firstLv5").instanceId;
    const firstLv4Id = s.inst("firstLv4").instanceId;
    const secondId = s.inst("second").instanceId;
    const secondLv5Id = s.inst("secondLv5").instanceId;
    const secondLv4Id = s.inst("secondLv4").instanceId;
    s.state.memory = 3;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ouryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").topCard.cardId === "BT24-046");
    expect(s.perm("first").topCard.cardId).toBe("BT24-046");
    expect(s.perm("first").topCard.instanceId).toBe(firstLv4Id);
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([firstId, firstLv5Id]),
    );
    expect(s.perm("second").topCard.cardId).toBe("BT24-051");
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    preferred.splice(0, preferred.length, s.perm("second").topCard.instanceId);

    const laterTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ouryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").topCard.cardId === "BT24-046");
    expect(s.perm("second").topCard.cardId).toBe("BT24-046");
    expect(s.perm("second").topCard.instanceId).toBe(secondLv4Id);
    expect(s.perm("second").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([secondId, secondLv5Id]),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("security1").instanceId, s.inst("security2").instanceId]),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await laterTurn;
  });
});
