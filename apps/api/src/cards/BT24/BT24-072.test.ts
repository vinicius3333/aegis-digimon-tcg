import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_072 } from "./BT24-072.js";
import "../index.js";

describe("BT24-072 SkullGreymon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-072")).toMatchObject({
      cardId: "BT24-072",
      nameEn: "SkullGreymon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead", "Titan", "TS"],
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
    });
  });

  it("requires the hand-trash cost before granting both keywords", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_072.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        cost: { kind: "trash", target: { filter: { zone: "hand" } } },
        optional: true,
        abortOnDecline: true,
      });
      expect(actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Retaliation" },
        target: { sameTarget: true },
      });
    }
  });

  it("public play pays 7, trashes the cost, and grants both keywords", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT1-009", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullgreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Retaliation"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Blocker")).toBe(true);
  });

  it("publicly selects a Titan target and excludes a neighboring nonmatching Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-013", as: "titan" },
            { card: "BT1-009", as: "neighbor" },
          ],
          hand: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT1-010", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullgreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("titan"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("titan"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("titan"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("neighbor"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("neighbor"), "Retaliation")).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it.each([
    ["normal purple level-4 requirement", "BT24-070", false],
    ["alternate Demon requirement without matching color", "BT1-069", true],
    ["alternate TS requirement", "BT24-046", true],
  ])("uses the %s for cost 3", async (_label, baseCard, useAlternateCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT1-009", as: "cost" },
          ],
          deck: [{ card: "BT1-011", as: "bonusDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullgreymon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Retaliation"));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("skullgreymon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
  });

  it("public play refuses the keyword grant when no hand card can pay its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "neutral" }],
          hand: [{ card: "BT24-072", as: "skullgreymon" }],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullgreymon").instanceId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("skullgreymon").instanceId,
      ),
    ).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Retaliation")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("public play can decline the payable hand-trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT1-009", as: "cost" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const costId = s.inst("cost").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullgreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT24-072"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(costId);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Retaliation")).toBe(false);
  });

  it("keeps a granted Shaman's keywords through the opponent turn, then expires them", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "shaman", dp: 6000 }],
          hand: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT1-009", as: "cost" },
          ],
          security: [{ card: "BT1-013", as: "ownSecurity" }],
          deck: ["BT1-011", "BT1-015"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 2000 }],
          security: [{ card: "BT1-015", as: "opponentSecurity" }],
          deck: ["BT1-011", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("shaman").instanceId);
    s.state.memory = 8;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const shamanId = s.perm("shaman").permanentId;
    const attackerCardId = s.inst("attacker").instanceId;
    const ownSecurityId = s.inst("ownSecurity").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullgreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("shaman"), "Retaliation"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Retaliation")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: shamanId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerCardId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shamanId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([ownSecurityId]);
    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Retaliation")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    await settle(() => !observe(s.engine).hasKeyword(s.perm("shaman"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Retaliation")).toBe(false);
  });

  it("uses granted Retaliation when a Demon blocks a stronger attacker", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "demon", dp: 3000 }],
          hand: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT1-009", as: "cost" },
          ],
          security: [{ card: "BT1-013", as: "ownSecurity" }],
          deck: ["BT1-011", "BT1-015"],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }], deck: ["BT1-011", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("demon").instanceId);
    s.state.memory = 8;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const demonId = s.perm("demon").permanentId;
    const demonCardId = s.inst("demon").instanceId;
    const attackerCardId = s.inst("attacker").instanceId;
    const ownSecurityId = s.inst("ownSecurity").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullgreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("demon"), "Retaliation"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: demonId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(demonCardId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerCardId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([ownSecurityId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("rejects an invalid Red evolution source without Demon or TS", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "invalid" }], hand: [{ card: "BT24-072", as: "skullgreymon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.perm("invalid").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalid").permanentId,
        instanceId: s.inst("skullgreymon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(5);
    expect(s.perm("invalid").topCard.instanceId).toBe(sourceId);
  });

  it("pays the hand-trash cost to grant Blocker and Retaliation to the same eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "skullgreymon" }],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("skullgreymon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Retaliation")).toBe(true);
  });

  it("grants neither keyword when the hand-trash cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT1-069", as: "eligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("skullgreymon"));

    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Retaliation")).toBe(false);
  });

  it.each([
    ["Demon", "BT1-069"],
    ["Titan", "BT24-013"],
  ])("public Happy Bullet deletion revives a level-4 %s from trash", async (_label, reviveCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "skullgreymon" }],
          trash: [
            { card: reviveCard, as: "revive" },
            { card: "BT1-015", as: "invalidLevelOrTrait" },
            { card: "BT24-075", as: "invalidLevel5" },
          ],
          security: [{ card: "BT1-013", as: "ownSecurity" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "colorSource" }],
          hand: [{ card: "BT6-095", as: "happyBullet" }],
          deck: ["BT1-009", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("revive").instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    const hostId = s.inst("skullgreymon").instanceId;
    const hostPermanentId = s.perm("skullgreymon").permanentId;
    const reviveId = s.inst("revive").instanceId;
    const optionId = s.inst("happyBullet").instanceId;
    const securityId = s.inst("ownSecurity").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("happyBullet").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === optionId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === reviveId),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(hostId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(reviveId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      s.inst("invalidLevelOrTrait").instanceId,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("invalidLevel5").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(reviveId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
  });

  it("public On Deletion refusal leaves a payable valid candidate and nonmatches in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "skullgreymon" }],
          trash: [
            { card: "BT1-069", as: "revive" },
            { card: "BT1-015", as: "invalidLevelOrTrait" },
            { card: "BT24-075", as: "invalidLevel5" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "colorSource" }],
          hand: [{ card: "BT6-095", as: "happyBullet" }],
          deck: ["BT1-009", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    const hostId = s.inst("skullgreymon").instanceId;
    const hostPermanentId = s.perm("skullgreymon").permanentId;
    const reviveId = s.inst("revive").instanceId;
    const optionId = s.inst("happyBullet").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("happyBullet").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === optionId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === hostId),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostPermanentId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        hostId,
        reviveId,
        s.inst("invalidLevelOrTrait").instanceId,
        s.inst("invalidLevel5").instanceId,
      ]),
    );
  });

  it("does not revive a nonmatching or level-5 card from a public deletion pool", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "skullgreymon" }],
          trash: [
            { card: "BT1-015", as: "nonmatching" },
            { card: "BT24-075", as: "level5Titan" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "colorSource" }],
          hand: [{ card: "BT6-095", as: "happyBullet" }],
          deck: ["BT1-009", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    const hostId = s.inst("skullgreymon").instanceId;
    const optionId = s.inst("happyBullet").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === optionId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === hostId),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([hostId, s.inst("nonmatching").instanceId, s.inst("level5Titan").instanceId]),
    );
  });

  it.each([
    ["exact Titamon name", "BT6-081"],
    ["Titan trait", "BT25-019"],
  ])("inherited effect grants Security Attack +1 for the %s alternative", async (_label, topCard) => {
    const s = setupEngine({ 0: { battleArea: [{ card: topCard, as: "host", under: ["BT24-072"] }] } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it.each([
    ["Titamon", "BT6-081", 2],
    ["Titan TS", "BT25-019", 2],
    ["neutral", "BT3-089", 1],
  ])("publicly performs the expected Security Attack count for %s", async (_label, hostCard, checks) => {
    const s = setupEngine({
      0: { battleArea: [{ card: hostCard, as: "host", under: [{ card: "BT24-072", as: "source072" }] }] },
      1: {
        security: [
          { card: "BT1-009", as: "security1" },
          { card: "BT1-013", as: "security2" },
        ],
      },
    });
    await s.ready();
    const hostTopId = s.perm("host").topCard.instanceId;
    const sourceId = s.inst("source072").instanceId;
    const securityIds = [s.inst("security1").instanceId, s.inst("security2").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length >= checks &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(checks);
    expect(s.state.players[1]!.security).toHaveLength(2 - checks);
    expect(s.perm("host").topCard.instanceId).toBe(hostTopId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(securityIds.slice(0, checks));
  });
});
