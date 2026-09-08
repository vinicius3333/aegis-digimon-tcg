import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_057 } from "./BT24-057.js";
import "../index.js";

describe("BT24-057 Docmon", () => {
  it("matches the immutable catalog identity and link route", () => {
    expect(getCardDefinition("BT24-057")).toMatchObject({
      cardId: "BT24-057",
      nameEn: "Docmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Sup.", "Appmon"],
      attributes: ["Life"],
      types: ["Doctor"],
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
    });
    expect(BT24_057.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
  });

  it("plays from security at battle end and restricts one opposing Digimon", () => {
    const security = BT24_057.effects?.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ trigger: "Security", timing: "endOfBattle", isSecurity: true });
    expect(security?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityBattleEnded",
      once: true,
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
    });
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      const effect = BT24_057.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Restrict",
        restriction: "attackPlayers",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("models its cost-2 Appmon link and linked De-Digivolve 1", () => {
    expect(BT24_057.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(BT24_057.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "DeDigivolve", amount: 1 }],
    });
  });

  it("a real security check plays itself and applies On Play", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT24-057", as: "docmon" }] },
        1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const docmonId = s.inst("docmon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked") &&
        s.events.some((event) => event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.events.find((event) => event.kind === "securityChecked")).toMatchObject({
      resolution: "battle",
      battle: { attackerDeleted: false },
    });
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === docmonId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("attacker"), "attackPlayers")).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("a weaker attacker is deleted by the real Security battle while Docmon is played", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT24-057", as: "docmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const attackerInstanceId = s.inst("attacker").instanceId;
    const docmonInstanceId = s.inst("docmon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked") &&
        s.events.some((event) => event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.events.find((event) => event.kind === "securityChecked")).toMatchObject({
      resolution: "battle",
      battle: { attackerDeleted: true },
    });
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerInstanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === docmonInstanceId)).toBe(
      true,
    );
  });

  it("normal black level-3 evolution costs 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-036", as: "base" }],
        hand: [{ card: "BT24-057", as: "docmon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("docmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("docmon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("docmon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("On Play prevents an opposing Digimon from attacking players", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-057", as: "docmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("docmon"));

    expect(observe(s.engine).isRestricted(s.perm("target"), "attackPlayers")).toBe(true);
  });

  it("public play pays 4 and restricts one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-057", as: "docmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("docmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attackPlayers"));

    expect(s.state.memory).toBe(1);
  });

  it("a public opponent When Digivolving deletion applies the On Deletion restriction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-057", as: "docmon" }] },
        1: {
          battleArea: [
            { card: "BT10-064", as: "base" },
            { card: "BT1-009", as: "target" },
          ],
          hand: [{ card: "ST15-13", as: "hiandromon" }],
        },
      },
      { autoSelectCards: true },
    );
    const docmonId = s.perm("docmon").permanentId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hiandromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attackPlayers"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === docmonId)).toBe(false);
  });

  it("publicly links for cost 2 and De-Digivolves after Happy Bullet deletes its host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-067", as: "host" }],
          hand: [{ card: "BT24-057", as: "docmon" }],
        },
        1: {
          battleArea: [
            { card: "BT24-051", as: "target", under: [{ card: "BT24-050", as: "targetSource" }] },
            { card: "BT1-020", as: "colorSource" },
          ],
          hand: [{ card: "BT6-095", as: "happyBullet" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const hostDp = s.perm("host").currentDP;
    const hostInstanceId = s.inst("host").instanceId;
    const docmonInstanceId = s.inst("docmon").instanceId;
    const targetTopId = s.perm("target").topCard.instanceId;
    const targetSourceId = s.inst("targetSource").instanceId;
    const happyBulletId = s.inst("happyBullet").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("docmon").instanceId,
        targetPermanentId: hostId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("docmon").instanceId));
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(hostDp + 3000);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("happyBullet").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("host").instanceId));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(happyBulletId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([hostInstanceId, docmonInstanceId]),
    );
    expect(s.perm("target").topCard.instanceId).toBe(targetSourceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(targetTopId);
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("cancels the linked De-Digivolve when BT7-107 returns its deleted host first (Q5643)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-067", as: "host" }],
          hand: [
            { card: "BT24-057", as: "docmon" },
            { card: "BT7-107", as: "calling" },
          ],
          deck: [{ card: "BT1-009", as: "drawBoundary" }],
        },
        1: { battleArea: [{ card: "BT24-051", as: "target", under: [{ card: "BT24-050", as: "targetSource" }] }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const deckIds = s.state.players[0]!.deck.map((card) => card.instanceId);
    const targetTopId = s.perm("target").topCard.instanceId;
    const targetSourceId = s.inst("targetSource").instanceId;
    const callingId = s.inst("calling").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("docmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("docmon").instanceId));
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calling").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("host").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("host").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("docmon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(callingId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckIds);
    expect(s.perm("target").topCard.instanceId).toBe(targetTopId);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([targetSourceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("docmon").instanceId);
  });
});
