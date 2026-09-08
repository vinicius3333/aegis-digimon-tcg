import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_069 } from "./BT24-069.js";
import "../index.js";

describe("BT24-069 Vilemon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-069")).toMatchObject({
      cardId: "BT24-069",
      nameEn: "Vilemon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Evil"],
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
    });
  });

  it("lets the opponent choose their discard and mills only when they decline", () => {
    for (const trigger of ["WhenMoving", "WhenDigivolving"]) {
      const actions = BT24_069.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[1]).toMatchObject({
        kind: "Trash",
        controller: "opponent",
        chooser: "opponent",
        optional: true,
      });
      expect(actions[2]).toMatchObject({
        kind: "TrashTopDeck",
        controller: "opponent",
        amount: 2,
        condition: { kind: "ifThisEffectDidNotAct" },
      });
    }
  });

  it("trashes from both hands without milling when the opponent accepts", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-068", as: "base" }],
          hand: [
            { card: "BT24-069", as: "vilemon" },
            { card: "BT4-022", as: "ownCard" },
          ],
          deck: [{ card: "BT1-009", as: "bonusDraw" }],
        },
        1: {
          hand: [{ card: "BT4-022", as: "opponentCard" }],
          deck: [
            { card: "BT4-022", as: "firstDeck" },
            { card: "BT4-022", as: "secondDeck" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 4;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    preferred.push(s.inst("ownCard").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vilemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("vilemon").instanceId);
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentCard").instanceId));

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("vilemon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownCard").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.deck).toHaveLength(2);
  });

  it("resolves When Moving from a public breeding promotion", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-069", as: "vilemon" },
          hand: [{ card: "BT1-009", as: "ownCard" }],
        },
        1: {
          hand: [{ card: "BT1-010", as: "opponentCard" }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("vilemon").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentCard").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownCard").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("publicly mills two opposing cards when the opponent declines the discard during promotion", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-069", as: "vilemon" },
          hand: [{ card: "BT1-009", as: "ownCard" }],
        },
        1: {
          hand: [{ card: "BT1-010", as: "opponentCard" }],
          deck: [
            { card: "BT1-011", as: "firstDeck" },
            { card: "BT1-012", as: "secondDeck" },
            { card: "BT1-013", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 0;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("vilemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const discardChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: discardChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownCard").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstDeck").instanceId, s.inst("secondDeck").instanceId]),
    );
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("vilemon").instanceId),
    ).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("publicly falls back to milling when the opponent declines the When Digivolving discard", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-068", as: "base" }],
          hand: [
            { card: "BT24-069", as: "vilemon" },
            { card: "BT4-022", as: "ownCard" },
          ],
          deck: [{ card: "BT1-009", as: "bonusDraw" }],
        },
        1: {
          hand: [{ card: "BT4-022", as: "opponentCard" }],
          deck: [
            { card: "BT4-022", as: "firstDeck" },
            { card: "BT4-022", as: "secondDeck" },
            { card: "BT4-022", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 4;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vilemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const ownChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ownChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("ownCard").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const discardChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: discardChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("secondDeck").instanceId));
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("vilemon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownCard").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstDeck").instanceId, s.inst("secondDeck").instanceId]),
    );
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("untouched").instanceId]);
  });

  it("rejects an illegal Red level-3 evolution source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "BT24-069", as: "vilemon" }] },
    });
    s.state.memory = 4;
    await s.ready();
    const baseId = s.perm("redBase").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("vilemon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(4);
    expect(s.perm("redBase").topCard.instanceId).toBe(baseId);
    expect(s.perm("redBase").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("vilemon").instanceId);
  });

  it("gains Blocker and 2000 DP at 10 cards in the opponent's trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-069", as: "vilemon" }] },
      1: { trash: Array.from({ length: 10 }, () => "BT1-009") },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("vilemon"), "Blocker")).toBe(true);
    expect(s.perm("vilemon").currentDP).toBe(6000);
  });

  it("does not gain Blocker or 2000 DP at nine opponent trash cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-069", as: "vilemon" }], security: [{ card: "BT1-009", as: "security" }] },
        1: {
          battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }],
          trash: Array.from({ length: 9 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const vilemonId = s.perm("vilemon").permanentId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("vilemon"), "Blocker")).toBe(false);
    expect(s.perm("vilemon").currentDP).toBe(4000);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === vilemonId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("vilemon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
  });

  it("publicly blocks a stronger attack after the opponent reaches the 10-trash threshold", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-069", as: "vilemon" }] },
        1: {
          battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }],
          trash: Array.from({ length: 10 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const vilemonInstanceId = s.inst("vilemon").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("vilemon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(vilemonInstanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("attacker").instanceId);
  });

  it("public attack trashes both players' top cards through the inherited effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-075", as: "host", under: ["BT24-069"] }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: {
        deck: [
          { card: "BT1-011", as: "theirFirst" },
          { card: "BT1-012", as: "theirSecond" },
        ],
        security: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("theirFirst").instanceId);
  });

  it("suppresses inherited mill on a same-turn second attack and resets after real turns", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "host", under: [{ card: "BT24-069", as: "vilemonSource" }] }],
          hand: [{ card: "BT24-050", as: "unsuspend" }],
          deck: ["BT1-009", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          deck: ["BT1-014", "BT1-015", "BT1-016", "BT1-017"],
          security: [
            { card: "BT1-018", as: "security1" },
            { card: "BT1-019", as: "security2" },
            { card: "BT1-015", as: "security3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const mineFirst = s.state.players[0]!.deck[0]!.instanceId;
    const mineSecond = s.state.players[0]!.deck[1]!.instanceId;
    const mineFourth = s.state.players[0]!.deck[3]!.instanceId;
    const theirFirst = s.state.players[1]!.deck[0]!.instanceId;
    const theirSecond = s.state.players[1]!.deck[1]!.instanceId;
    const theirFourth = s.state.players[1]!.deck[3]!.instanceId;
    const mineThird = s.state.players[0]!.deck[2]!.instanceId;
    const theirThird = s.state.players[1]!.deck[2]!.instanceId;
    const security1 = s.inst("security1").instanceId;
    const security2 = s.inst("security2").instanceId;
    const security3 = s.inst("security3").instanceId;
    const sourceId = s.inst("vilemonSource").instanceId;
    const hostId = s.perm("host").permanentId;
    await s.ready();
    s.state.memory = 10;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(mineFirst);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(theirFirst);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(security1);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([security2, security3]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspend").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(mineSecond);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(theirSecond);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([mineSecond, mineThird, mineFourth]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([theirSecond, theirThird, theirFourth]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([security3]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(theirSecond);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(mineSecond);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(mineThird);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(theirThird);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(security3);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });
});
