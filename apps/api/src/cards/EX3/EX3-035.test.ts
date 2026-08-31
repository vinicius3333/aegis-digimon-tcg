import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-035.js";
import "./EX3-069.js";
import "../BT16/BT16-014.js";

describe("EX3-035 Goldramon", () => {
  it("has the official metadata, digivolves for 3, and plays for 12", async () => {
    expect(getCardDefinition("EX3-035")).toMatchObject({
      cardId: "EX3-035",
      nameEn: "Goldramon",
      colors: ["Yellow"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Dragon", "Four Great Dragons"],
      rarity: "SR",
      imageId: "EX3-035-Errata",
    });

    const evolution = setupEngine({
      0: {
        battleArea: [{ card: "BT1-057", as: "base" }],
        hand: [{ card: "EX3-035", as: "goldramon" }],
        deck: ["BT1-001"],
      },
    });
    evolution.state.memory = 3;
    await evolution.ready();
    expect(
      evolution.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolution.perm("base").permanentId,
        instanceId: evolution.inst("goldramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolution.perm("base").topCard.cardId === "EX3-035");
    expect(evolution.state.memory).toBe(0);

    const play = setupEngine({ 0: { hand: [{ card: "EX3-035", as: "goldramon" }] } });
    play.state.memory = 12;
    await play.ready();
    expect(play.engine.applyIntent(0, { type: "playCard", instanceId: play.inst("goldramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => play.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-035"));
    expect(play.state.memory).toBe(0);
  });

  it("Q2613/Four Great Dragons family: returns Trial or a Digimon after one optional confirmation", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-034", as: "base" }],
          hand: [{ card: "EX3-035", as: "goldramon" }],
          trash: [
            { card: "EX3-069", as: "trial" },
            { card: "EX3-036", as: "magnadramon" },
            { card: "BT1-010", as: "unrelated" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("trial").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("goldramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("trial").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("trial").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("magnadramon").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("unrelated").instanceId);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-035" && req.kind === "optional")).toHaveLength(1);
    const selection = s.decisions.find(({ req }) => req.sourceCardId === "EX3-035" && req.kind === "selectCards")!.req;
    expect(selection.options).toMatchObject({ min: 1, max: 1 });
    expect(selection.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("trial").instanceId, s.inst("magnadramon").instanceId]),
    );
    expect(selection.options?.candidateInstanceIds).not.toContain(s.inst("unrelated").instanceId);
    expect(selection.options).toMatchObject({
      visibleInstanceIds: expect.arrayContaining([
        s.inst("trial").instanceId,
        s.inst("magnadramon").instanceId,
        s.inst("unrelated").instanceId,
      ]),
      visibleCards: expect.arrayContaining([
        { instanceId: s.inst("trial").instanceId, cardId: "EX3-069" },
        { instanceId: s.inst("magnadramon").instanceId, cardId: "EX3-036" },
        { instanceId: s.inst("unrelated").instanceId, cardId: "BT1-010" },
      ]),
      timing: "WhenDigivolving",
    });
    expect(selection.options?.effectText).toContain("[When Digivolving]");
  });

  it("Q2613: lets the player resolve gained Goldramon first, then use the returned Trial", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-035", as: "goldramon" }],
          hand: [{ card: "BT16-014", as: "goldramonX" }],
          trash: [{ card: "EX3-069", as: "trial" }],
          deck: [
            { card: "BT1-001", as: "digivolutionDraw" },
            { card: "BT1-002", as: "trialDraw" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false, autoOrderTriggers: false },
    );
    s.state.memory = 2;
    await s.ready();
    const trialId = s.inst("trial").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goldramon").permanentId,
        instanceId: s.inst("goldramonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const ordering = s.decisions.at(-1)!.req;
    const goldramonIndex = ordering.options!.triggerCardIds!.indexOf("EX3-035");
    expect(goldramonIndex).toBeGreaterThanOrEqual(0);
    expect(ordering.options!.triggerCardIds).toContain("BT16-014");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("digivolutionDraw").instanceId,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("trialDraw").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("trialDraw").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "orderTriggers", order: [ordering.options!.triggerKeys![goldramonIndex]!] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.decisions.at(-1)?.req.sourceCardId === "EX3-035",
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "selectCards" && s.decisions.at(-1)?.req.sourceCardId === "EX3-035",
    );
    if (s.state.pendingDecision?.kind === "selectCards") {
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision.decisionId,
          response: { kind: "selectCards", instanceIds: [trialId] },
        }),
      ).toEqual({ ok: true });
    }
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === trialId) &&
        s.state.pendingDecision?.kind === "optional" &&
        s.decisions.at(-1)?.req.sourceCardId === "BT16-014",
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(trialId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === trialId));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(trialId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(trialId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("digivolutionDraw").instanceId, s.inst("trialDraw").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "orderTriggers").length).toBeGreaterThanOrEqual(1);
  });

  it("leaves the Four Great Dragons card in trash when the errata's may is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-034", as: "base" }],
          hand: [{ card: "EX3-035", as: "goldramon" }],
          trash: [{ card: "EX3-036", as: "magnadramon" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("goldramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-001") &&
        s.decisions.some(({ req }) => req.sourceCardId === "EX3-035" && req.kind === "optional"),
    );

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("magnadramon").instanceId);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-035" && req.kind === "optional")).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-035" && req.kind === "selectCards")).toHaveLength(
      0,
    );
  });

  it("pays the exact 3-name attack cost, orders it at deck bottom, and trashes 2 security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-035", as: "goldramon" }],
          trash: [
            { card: "EX3-036", as: "magnadramon" },
            { card: "EX3-036", as: "duplicateMagnadramon" },
            { card: "EX3-025", as: "azulongmon" },
            { card: "EX3-064", as: "megidramon" },
          ],
          deck: [{ card: "BT1-001", as: "deckTop" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 10000, as: "chosenTarget" },
            { card: "BT1-011", dp: 10000, as: "unchosenTarget" },
          ],
          security: ["BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoSelectCards: true, autoOrderCards: false, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosenTarget").permanentId, s.inst("duplicateMagnadramon").instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("goldramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const requestedOrder = [
      s.inst("megidramon").instanceId,
      s.inst("azulongmon").instanceId,
      s.inst("duplicateMagnadramon").instanceId,
    ];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "orderCards", order: requestedOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && s.perm("chosenTarget").currentDP === 4000);

    expect(s.perm("chosenTarget").currentDP).toBe(4000);
    expect(s.perm("unchosenTarget").currentDP).toBe(10000);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.length).toBeGreaterThanOrEqual(2);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("magnadramon").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckTop").instanceId,
      ...requestedOrder,
    ]);

    const selections = s.decisions.filter(({ req }) => req.sourceCardId === "EX3-035" && req.kind === "selectCards");
    expect(selections).toHaveLength(3);
    expect(selections.map(({ req }) => req.options?.min)).toEqual([0, 1, 1]);
    expect(selections[0]!.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("magnadramon").instanceId, s.inst("duplicateMagnadramon").instanceId]),
    );
    expect(selections[1]!.req.options?.candidateInstanceIds).toEqual([s.inst("azulongmon").instanceId]);
    expect(selections[2]!.req.options?.candidateInstanceIds).toEqual([s.inst("megidramon").instanceId]);
    const allTrashIds = [
      s.inst("magnadramon").instanceId,
      s.inst("duplicateMagnadramon").instanceId,
      s.inst("azulongmon").instanceId,
      s.inst("megidramon").instanceId,
    ];
    for (const { req } of selections) {
      expect(req.options).toMatchObject({
        visibleInstanceIds: expect.arrayContaining(allTrashIds),
        visibleCards: expect.arrayContaining(allTrashIds.map((instanceId) => expect.objectContaining({ instanceId }))),
        timing: "OnAllyAttack",
      });
      expect(req.options?.effectText).toContain("[When Attacking]");
    }
    const order = s.decisions.find(({ req }) => req.sourceCardId === "EX3-035" && req.kind === "orderCards")!.req;
    expect(order.options?.orderDestination).toBe("deckBottom");
    expect(order.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.inst("duplicateMagnadramon").instanceId,
        s.inst("azulongmon").instanceId,
        s.inst("megidramon").instanceId,
      ]),
    );
  });

  it("continues the attack cost without an opposing Digimon and safely empties short security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-035", as: "goldramon" }],
          trash: ["EX3-036", "EX3-025", "EX3-064"],
        },
        1: { security: [{ card: "BT1-002", as: "onlySecurity" }] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("goldramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("onlySecurity").instanceId);
    expect(s.decisions.some(({ req }) => req.kind === "chooseTargets")).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-035" && req.kind === "selectCards")).toHaveLength(
      3,
    );
  });

  it("deletes an opposing 6000 DP Digimon before resolving the rest of the attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-035", as: "goldramon" }],
          trash: ["EX3-036", "EX3-025", "EX3-064"],
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 6000, as: "target" }],
          security: ["BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    const targetInstanceId = s.perm("target").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("goldramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== s.perm("target").permanentId) &&
        s.state.players[1]!.security.length === 0,
    );

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(targetInstanceId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("pays the three-name cost safely when the opponent already has no security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-035", as: "goldramon" }],
          trash: ["EX3-036", "EX3-025", "EX3-064"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("goldramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["EX3-036", "EX3-025", "EX3-064"]);
  });

  it("may decline the 3-name cost while the mandatory -6000 DP still resolves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-035", as: "goldramon" }],
        trash: [
          { card: "EX3-036", as: "magnadramon" },
          { card: "EX3-025", as: "azulongmon" },
          { card: "EX3-064", as: "megidramon" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", dp: 10000, as: "chosenTarget" },
          { card: "BT1-011", dp: 10000, as: "otherTarget" },
        ],
        security: ["BT1-002", "BT1-003", "BT1-004"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("goldramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosenTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    decision = s.state.pendingDecision!;
    expect(JSON.parse(decision.payloadJson)).toMatchObject({ min: 0, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && s.perm("chosenTarget").currentDP === 4000);

    expect(s.perm("chosenTarget").currentDP).toBe(4000);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.decisions.some(({ req }) => req.kind === "orderCards")).toBe(false);
  });

  it("does not offer or pay the security-trash cost when any required name is missing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-035", as: "goldramon" }],
          trash: [
            { card: "EX3-036", as: "firstMagnadramon" },
            { card: "EX3-036", as: "secondMagnadramon" },
            { card: "EX3-025", as: "azulongmon" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 10000, as: "target" }],
          security: ["BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("goldramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && s.perm("target").currentDP === 4000);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-035" && req.kind === "selectCards")).toHaveLength(
      0,
    );
  });

  it("expires the mandatory -6000 DP modifier at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-035", as: "goldramon" }],
          deck: ["BT1-001", "BT1-006"],
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 10000, as: "target" }],
          security: ["BT1-002", "BT1-003"],
          deck: ["BT1-004", "BT1-005"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("goldramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);

    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(10000);
  });
});
