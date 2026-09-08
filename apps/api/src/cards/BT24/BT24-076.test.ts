import { EffectTiming, getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_076 } from "./BT24-076.js";
import "../index.js";

describe("BT24-076 WarGrowlmon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-076")).toMatchObject({
      cardId: "BT24-076",
      nameEn: "WarGrowlmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg", "Dark Dragon"],
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
    });
  });

  it("keeps the trash Main cost reduction and level restrictions", () => {
    const trash = BT24_076.effects?.find((entry) => entry.trigger === "Main");
    expect(trash).toMatchObject({
      isFromTrash: true,
      condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
    });
    expect(trash?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: true,
      reduceCostBy: 2,
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_076.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { levelComparison: { op: "lte", value: 4 } }, count: 1 },
      });
    }
  });

  it("activates from trash at four cards in hand and pays the play cost reduced by 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          trash: [{ card: "BT24-076", as: "wargrowlmon" }],
          deck: ["BT1-013", "BT1-015"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "target" },
            { card: "BT24-072", as: "level5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;
    const targetCardId = s.inst("target").instanceId;
    const level5Id = s.perm("level5").permanentId;
    const sourceId = s.inst("wargrowlmon").instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await s.engine.recomputeContinuousEffects();
    const effects = JSON.parse(s.inst("wargrowlmon").activatableEffectsJson || "[]") as { effectKey: string }[];

    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("wargrowlmon").instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("wargrowlmon").instanceId,
      ),
    );
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(sourceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(sourceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(level5Id);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(targetCardId);

    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("does not activate from trash above four cards in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "neutral" }],
        hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        trash: [{ card: "BT24-076", as: "wargrowlmon" }],
      },
    });
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await s.engine.recomputeContinuousEffects();
    const effects = JSON.parse(s.inst("wargrowlmon").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(effects).toHaveLength(1);
    const sourceId = s.inst("wargrowlmon").instanceId;
    s.give(0, Zone.Hand, { card: "BT1-013", as: "fifth" });
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceId,
        effectKey: effects[0]!.effectKey,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(sourceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).not.toContain(sourceId);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("wargrowlmon").instanceId,
        effectKey: "BT24-076/ir-0-0",
      }).ok,
    ).toBe(false);

    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("public play pays 7 and deletes only a level 4 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-076", as: "wargrowlmon" }] },
        1: {
          battleArea: [
            { card: "BT1-014", as: "level4" },
            { card: "BT24-072", as: "level5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const level4Id = s.perm("level4").permanentId;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargrowlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level4Id));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("level5").permanentId,
    );
  });

  it("does not expose the trash Main effect for copies in hand or battle", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-076", as: "handCopy" }, "BT1-009", "BT1-011", "BT1-013"],
          battleArea: [{ card: "BT24-076", as: "battleCopy" }],
          trash: [{ card: "BT24-076", as: "trashCopy" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await s.engine.recomputeContinuousEffects();
    const effects = JSON.parse(s.inst("trashCopy").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("handCopy").instanceId,
        effectKey: effects[0]!.effectKey,
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("battleCopy").instanceId,
        effectKey: effects[0]!.effectKey,
      }).ok,
    ).toBe(false);
    expect(JSON.parse(s.inst("handCopy").activatableEffectsJson || "[]")).toHaveLength(0);
    expect(JSON.parse(s.inst("battleCopy").activatableEffectsJson || "[]")).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("public evolution pays 3 and resolves the level-4 deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-070", as: "base" }],
          hand: [{ card: "BT24-076", as: "wargrowlmon" }],
          deck: [{ card: "BT1-011", as: "bonusDraw" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "level4" }] },
      },
      { autoSelectCards: true },
    );
    const level4Id = s.perm("level4").permanentId;
    const sourceId = s.perm("base").topCard.instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level4Id));

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("wargrowlmon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("level4").instanceId);
  });

  it("rejects a non-Purple level-4 evolution source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "invalid" }], hand: [{ card: "BT24-076", as: "wargrowlmon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.perm("invalid").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalid").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(5);
    expect(s.perm("invalid").topCard.instanceId).toBe(sourceId);
  });

  it("deletes a level 4 or lower Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-076", as: "wargrowlmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wargrowlmon"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetId);
  });

  it.each([
    ["Dark Dragon", "BT12-010"],
    ["Evil Dragon", "BT11-079"],
  ])("public Happy Bullet deletion revives the exact inherited %s candidate", async (_label, reviveCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-089", as: "host", under: [{ card: "BT24-076", as: "source076" }] }],
          trash: [
            { card: reviveCard, as: "revive" },
            { card: "BT1-015", as: "nonmatching" },
            { card: "BT24-076", as: "level5DarkDragon" },
          ],
          security: [{ card: "BT1-013", as: "ownSecurity" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          hand: [{ card: "BT6-095", as: "happyBullet" }],
          battleArea: [{ card: "BT1-020", as: "redSource" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    preferred.push(s.inst("revive").instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const hostId = s.perm("host").permanentId;
    const hostTopId = s.perm("host").topCard.instanceId;
    const sourceId = s.inst("source076").instanceId;
    const reviveId = s.inst("revive").instanceId;
    const optionId = s.inst("happyBullet").instanceId;
    const securityId = s.inst("ownSecurity").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === optionId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === reviveId),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    const revived = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === reviveId);
    expect(revived).toBeDefined();
    expect(revived!.permanentId).not.toBe(hostId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        hostTopId,
        sourceId,
        s.inst("nonmatching").instanceId,
        s.inst("level5DarkDragon").instanceId,
      ]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(reviveId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("may refuse inherited revival after a public Happy Bullet deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-089", as: "host", under: [{ card: "BT24-076", as: "source076" }] }],
          trash: [{ card: "BT11-079", as: "revive" }],
          security: [{ card: "BT1-013", as: "ownSecurity" }],
        },
        1: {
          hand: [{ card: "BT6-095", as: "happyBullet" }],
          battleArea: [{ card: "BT1-020", as: "redSource" }],
          deck: ["BT1-009", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const hostId = s.perm("host").permanentId;
    const hostCardId = s.perm("host").topCard.instanceId;
    const sourceId = s.inst("source076").instanceId;
    const reviveId = s.inst("revive").instanceId;
    const optionId = s.inst("happyBullet").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === optionId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === hostCardId),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(reviveId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(sourceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("does not revive nonmatching or level-5 cards from inherited deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-089", as: "host", under: [{ card: "BT24-076", as: "source076" }] }],
          trash: [
            { card: "BT1-015", as: "nonmatching" },
            { card: "BT24-076", as: "level5DarkDragon" },
          ],
        },
        1: {
          hand: [{ card: "BT6-095", as: "happyBullet" }],
          battleArea: [{ card: "BT1-020", as: "redSource" }],
          deck: ["BT1-009", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const hostId = s.perm("host").permanentId;
    const hostCardId = s.perm("host").topCard.instanceId;
    const sourceId = s.inst("source076").instanceId;
    const optionId = s.inst("happyBullet").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === optionId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === sourceId),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("nonmatching").instanceId, s.inst("level5DarkDragon").instanceId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(hostCardId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });
});
