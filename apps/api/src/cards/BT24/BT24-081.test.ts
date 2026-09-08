import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { printedKeywordsOf } from "../../engine/combat/keywords.js";
import { getCardDefinition } from "@aegis/shared";
import { compiled as BT24_081 } from "./BT24-081.js";
import "../index.js";

describe("BT24-081 Titamon + SkullBaluchimon", () => {
  it("requires the printed hand-trash cost and separates Titamon from the level-limited Titan branch", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const action = BT24_081.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { superlative: "lowestLevel" }, count: "all" },
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" } } },
        optional: true,
        abortOnDecline: true,
      });
    }
    const deletion = BT24_081.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0];
    expect(deletion).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { nameOrTrait: [{ tokens: ["Titamon"], match: "nameExact" }] },
        orFilters: [{ levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] }],
      },
      from: ["trash"],
    });
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "pays one hand card to delete every lowest-level Digimon on %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT24-081", as: "titamon" }],
            hand: [{ card: "BT1-009", as: "cost" }],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "lowA" },
              { card: "BT1-010", as: "lowB" },
              { card: "BT1-014", as: "high" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const lowAId = s.perm("lowA").permanentId;
      const lowBId = s.perm("lowB").permanentId;
      const lowAInstanceId = s.inst("lowA").instanceId;
      const lowBInstanceId = s.inst("lowB").instanceId;
      const highId = s.perm("high").permanentId;
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("titamon"));

      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowBId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([highId]);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([lowAInstanceId, lowBInstanceId]);
    },
  );

  it("resolves the printed When Attacking deletion from a public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-081", as: "titamon" }],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
          security: [
            { card: "BT1-011", as: "securityChecked" },
            { card: "BT1-012", as: "securityRemaining" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    const highId = s.perm("high").permanentId;
    const lowAInstanceId = s.inst("lowA").instanceId;
    const lowBInstanceId = s.inst("lowB").instanceId;
    const securityCheckedId = s.inst("securityChecked").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("titamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.events.filter((event) => event.kind === "securityChecked").length === 1 &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowAId),
    );

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).not.toContain(lowAId);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).not.toContain(lowBId);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toContain(highId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([
      lowAInstanceId,
      lowBInstanceId,
      securityCheckedId,
    ]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["purple", "BT3-089"],
    ["green", "BT1-080"],
  ])("publicly evolves from a neutral %s level 6 for cost 4", async (_label, baseCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [
            { card: "BT24-081", as: "titamon" },
            { card: "BT1-009", as: "cost" },
          ],
          deck: [{ card: "BT1-010", as: "bonusDraw" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT1-014", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseId = s.inst("base").instanceId;
    const lowId = s.perm("low").permanentId;
    const lowInstanceId = s.inst("low").instanceId;
    const highId = s.perm("high").permanentId;
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowId));
    expect(s.state.memory).toBe(4);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("titamon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([highId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([lowInstanceId]);
  });

  it("rejects public evolution from a neutral red level 6", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-10", as: "base" }], hand: [{ card: "BT24-081", as: "titamon" }] },
    });
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("base").topCard.cardId).toBe("ST1-10");
    expect(s.state.memory).toBe(8);
  });

  it("deletes nothing when the hand-trash cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-081", as: "titamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("titamon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("naturally plays from hand and resolves the printed On Play deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-081", as: "titamon" },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const titamonId = s.inst("titamon").instanceId;
    const lowId = s.inst("low").instanceId;
    const lowBId = s.inst("lowB").instanceId;
    const highId = s.inst("high").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("titamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === titamonId) &&
        s.state.players[1]!.trash.some((card) => card.instanceId === lowId),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.memory).toBe(-4);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([highId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([lowId, lowBId]);
  });

  it("publicly revives exact Titamon after an opponent Happy Bullet deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-081", as: "titamon", under: [{ card: "BT3-089", as: "baseSource" }] }],
          trash: [
            { card: "BT24-081", as: "invalidComposite" },
            { card: "BT1-080", as: "exactTitamon" },
          ],
          deck: [{ card: "BT1-011", as: "ownerDraw" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "redSource" }],
          hand: [{ card: "BT6-095", as: "happyBullet" }],
          deck: [{ card: "BT1-012", as: "opponentDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const originalId = s.perm("titamon").permanentId;
    const sourceId = s.inst("titamon").instanceId;
    const baseSourceId = s.inst("baseSource").instanceId;
    const optionId = s.inst("happyBullet").instanceId;
    const exactTitamonId = s.inst("exactTitamon").instanceId;
    const invalidCompositeId = s.inst("invalidComposite").instanceId;
    preferred.push(exactTitamonId);
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === optionId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === exactTitamonId),
    );

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([exactTitamonId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(originalId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([sourceId, baseSourceId, invalidCompositeId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(exactTitamonId);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("publicly revives a level-5 Titan through the On Deletion alternate branch", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-081", as: "titamon", under: [{ card: "BT3-089", as: "baseSource" }] }],
          trash: [
            { card: "BT24-072", as: "titan" },
            { card: "BT24-081", as: "invalidComposite" },
            { card: "BT1-020", as: "invalidNonTitan" },
            { card: "BT25-019", as: "invalidHighTitan" },
          ],
          deck: [{ card: "BT1-011", as: "ownerDraw" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "redSource" }],
          hand: [{ card: "BT6-095", as: "happyBullet" }],
          deck: [{ card: "BT1-012", as: "opponentDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const originalId = s.perm("titamon").permanentId;
    const sourceId = s.inst("titamon").instanceId;
    const baseSourceId = s.inst("baseSource").instanceId;
    const optionId = s.inst("happyBullet").instanceId;
    const titanId = s.inst("titan").instanceId;
    const invalidIds = [
      s.inst("invalidComposite").instanceId,
      s.inst("invalidNonTitan").instanceId,
      s.inst("invalidHighTitan").instanceId,
    ];
    preferred.push(titanId);
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === optionId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === titanId),
    );
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([titanId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(originalId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([sourceId, baseSourceId, ...invalidIds]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(titanId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("publicly refuses the On Deletion Titan revival while retaining every trash candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-081", as: "titamon", under: [{ card: "BT3-089", as: "baseSource" }] }],
          trash: [
            { card: "BT24-072", as: "titan" },
            { card: "BT24-081", as: "invalidComposite" },
            { card: "BT1-020", as: "invalidNonTitan" },
            { card: "BT25-019", as: "invalidHighTitan" },
          ],
          deck: [{ card: "BT1-011", as: "ownerDraw" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "redSource" }],
          hand: [{ card: "BT6-095", as: "happyBullet" }],
          deck: [{ card: "BT1-012", as: "opponentDraw" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("titamon").instanceId;
    const baseSourceId = s.inst("baseSource").instanceId;
    const optionId = s.inst("happyBullet").instanceId;
    const candidateIds = [
      s.inst("titan").instanceId,
      s.inst("invalidComposite").instanceId,
      s.inst("invalidNonTitan").instanceId,
      s.inst("invalidHighTitan").instanceId,
    ];
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === optionId));
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([sourceId, baseSourceId, ...candidateIds]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("publicly uses Rush and Piercing after a discounted same-turn play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-088", as: "hirokoA" },
            { card: "BT26-088", as: "hirokoB" },
          ],
          hand: [{ card: "BT24-081", as: "titamon" }],
          deck: [{ card: "BT1-009", as: "ownerDraw" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "target", suspended: true }],
          security: [
            { card: "BT1-009", as: "securityChecked" },
            { card: "BT1-010", as: "securityRemainingA" },
            { card: "BT1-011", as: "securityRemainingB" },
          ],
          deck: [{ card: "BT1-012", as: "opponentDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 8;
    await s.ready();

    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(10);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("titamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("titamon").instanceId),
    );
    const attacker = s.perm("titamon");
    const targetId = s.perm("target").permanentId;
    expect(attacker.enterFieldTurnCount).toBe(s.state.turnCount);
    expect(s.state.memory).toBe(0);
    expect(s.perm("hirokoA").isSuspended).toBe(true);
    expect(s.perm("hirokoB").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() && s.events.filter((event) => event.kind === "securityChecked").length === 1,
    );

    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(attacker.topCard.instanceId);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).not.toContain(targetId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("securityRemainingA").instanceId,
      s.inst("securityRemainingB").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityChecked").instanceId);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("publicly executes an end-of-turn attack into an unsuspended Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-081", as: "titamon", under: [{ card: "BT3-089", as: "baseSource" }] }],
          trash: [{ card: "BT24-072", as: "titan" }],
          deck: [{ card: "BT1-009", as: "ownerDraw" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "target" }],
          security: [
            { card: "BT1-009", as: "securityChecked" },
            { card: "BT1-010", as: "securityRemaining" },
          ],
          deck: [{ card: "BT1-011", as: "opponentDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const originalId = s.perm("titamon").permanentId;
    const sourceId = s.inst("titamon").instanceId;
    const baseSourceId = s.inst("baseSource").instanceId;
    const targetId = s.perm("target").permanentId;
    const titanId = s.inst("titan").instanceId;
    preferred.push(targetId, titanId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === titanId),
    );

    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("securityRemaining").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityChecked").instanceId);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([titanId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(originalId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([sourceId, baseSourceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(titanId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("publicly refuses Execute at end of turn without attacking or self-deleting", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-081", as: "titamon", under: [{ card: "BT3-089", as: "baseSource" }] }],
          deck: [{ card: "BT1-009", as: "ownerDraw" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "target" }],
          security: [
            { card: "BT1-009", as: "securityA" },
            { card: "BT1-010", as: "securityB" },
          ],
          deck: [{ card: "BT1-011", as: "opponentDraw" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const titamonId = s.inst("titamon").instanceId;
    const baseSourceId = s.inst("baseSource").instanceId;
    const targetId = s.perm("target").permanentId;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;

    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([titamonId]);
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual([baseSourceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([targetId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("securityA").instanceId,
      s.inst("securityB").instanceId,
    ]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
  });

  it("publicly refuses the payable On Play cost while retaining all targets", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-081", as: "titamon" },
            { card: "BT1-009", as: "cost" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("titamon").instanceId })).toEqual({
      ok: true,
    });
    expect(s.state.memory).toBe(-4);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("titamon").instanceId),
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("lowA").instanceId,
      s.inst("lowB").instanceId,
      s.inst("high").instanceId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("publicly plays without a hand cost and leaves all targets unchanged", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-081", as: "titamon" }], deck: ["BT1-011", "BT1-012"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("titamon").instanceId })).toEqual({
      ok: true,
    });
    expect(s.state.memory).toBe(-4);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("titamon").instanceId),
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("lowA").instanceId,
      s.inst("lowB").instanceId,
      s.inst("high").instanceId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("revives exact Titamon without admitting the composite name", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-081", as: "source" }],
          trash: [
            { card: "BT24-081", as: "composite" },
            { card: "BT1-080", as: "exactTitamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("composite").instanceId, s.inst("exactTitamon").instanceId);
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("exactTitamon").instanceId,
      ),
    );

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("composite").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
  });

  it("revives a level 5 Titan through the alternate branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-081", as: "source" }],
          trash: [{ card: "BT24-072", as: "titan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("titan").instanceId),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
  });

  it("has Rush, Piercing, and Execute", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-081", as: "titamon" }] } });
    await s.ready();

    const printed = printedKeywordsOf(getCardDefinition("BT24-081")?.effectText);
    expect(printed).toEqual(expect.arrayContaining(["Rush", "Piercing", "Execute"]));
    expect(observe(s.engine).hasKeyword(s.perm("titamon"), "Rush")).toBe(true);
  });
});
