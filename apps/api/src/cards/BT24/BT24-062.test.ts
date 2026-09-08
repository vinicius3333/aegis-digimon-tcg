import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_062 } from "./BT24-062.js";
import "../index.js";

describe("BT24-062 MasterBlimpmon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-062")).toMatchObject({
      cardId: "BT24-062",
      nameEn: "MasterBlimpmon",
      colors: ["Black", "Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Machine", "Iliad", "TS"],
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Blue", level: 4, memoryCost: 4 },
      ],
    });
  });

  it("plays the qualifying card from this Digimon's stack at either shared timing", () => {
    const effects = BT24_062.effects?.filter((entry) => ["EndOfAttack", "EndOfOpponentsTurn"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.frequency).toBe("OncePerTurn");
      expect(effect.sharedUseKey).toBe("ir-shared-0");
      expect(effect.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"] });
      expect((effect.actions?.[0] as any).target.source).toBe("thisDigimon");
    }
  });

  it("has Blocker and Armor Purge", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-062", as: "master" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("master"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("master"), "Armor Purge")).toBe(true);
  });

  it.each([true, false])("public Happy Bullet Armor Purge accept=%s", async (accept) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-062", as: "master", under: ["BT24-058"] }] },
        1: { battleArea: [{ card: "BT1-020", as: "redSource" }], hand: [{ card: "BT6-095", as: "happyBullet" }] },
      },
      { autoSelectCards: accept, autoOrderTriggers: true },
    );
    const permanentId = s.perm("master").permanentId;
    const topId = s.perm("master").topCard.instanceId;
    const sourceId = s.perm("master").stack[0]!.instanceId;
    const optionId = s.inst("happyBullet").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    if (!accept) {
      const decision = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.events.some((event) => event.kind === "cardsMoved" && event.instanceIds.includes(optionId)));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    if (accept) {
      expect(s.perm("master").permanentId).toBe(permanentId);
      expect(s.perm("master").topCard.instanceId).toBe(sourceId);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(topId);
      expect(s.state.memory).toBe(0);
    } else {
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).not.toContain(permanentId);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
        expect.arrayContaining([topId, sourceId]),
      );
    }
  });

  it.each([
    ["normal black level-4 requirement", "BT15-061", false, 4],
    ["normal blue level-4 requirement", "BT10-020", false, 4],
    ["alternate Machine requirement", "BT15-061", true, 3],
    ["alternate Cyborg requirement", "BT10-020", true, 3],
    ["alternate TS requirement", "BT24-046", true, 3],
  ])("uses the %s", async (_label, baseCard, useAlternateCost, expectedCost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-062", as: "master" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.inst("base").instanceId;
    const drawId = s.inst("evolutionDraw").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("master").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("master").instanceId);

    expect(s.state.memory).toBe(5 - expectedCost);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("master").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
  });

  it("shares the public End of Attack and opponent-turn frequency across a real turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT24-062",
              as: "master",
              under: [
                { card: "BT2-052", as: "own3" },
                { card: "BT24-058", as: "own4" },
              ],
            },
            { card: "BT24-058", as: "neighbor", under: [{ card: "BT2-052", as: "neighbor3" }] },
          ],
          hand: [{ card: "BT24-050", as: "unsuspender" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          security: [
            { card: "BT1-013", as: "firstSecurity" },
            { card: "BT1-014", as: "secondSecurity" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          hand: ["BT1-009", "BT1-010"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        autoOrderCards: true,
        preferInstanceIds: preferred,
      },
    );
    s.state.memory = 10;
    await s.ready();
    const own3Id = s.perm("master").stack.find((card) => card.cardId === "BT2-052")!.instanceId;
    const own4Id = s.perm("master").stack.find((card) => card.cardId === "BT24-058")!.instanceId;
    const neighborId = s.perm("neighbor").permanentId;
    const neighbor3Id = s.perm("neighbor").stack[0]!.instanceId;
    const firstSecurityId = s.inst("firstSecurity").instanceId;
    const secondSecurityId = s.inst("secondSecurity").instanceId;
    preferred.push(own3Id);
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const masterId = s.perm("master").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("master").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === own3Id));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("master").topCard.cardId).toBe("BT24-062");
    expect(s.perm("master").stack.map((card) => card.instanceId)).toEqual([own4Id]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === own3Id)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(firstSecurityId);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(neighborId);
    expect(s.perm("neighbor").stack.map((card) => card.instanceId)).toEqual([neighbor3Id]);

    preferred.push(masterId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("master").isSuspended);
    expect(s.perm("master").permanentId).toBe(masterId);
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: masterId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(secondSecurityId);
    expect(s.perm("master").stack.map((card) => card.instanceId)).toEqual([own4Id]);
    expect(s.perm("neighbor").stack.map((card) => card.instanceId)).toEqual([neighbor3Id]);

    expect(s.perm("master").topCard.cardId).toBe("BT24-062");
    expect(s.perm("master").stack.map((card) => card.instanceId)).toEqual([own4Id]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === own4Id));
    await opponentTurn;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === own4Id)).toBe(true);
    expect(s.perm("master").topCard.cardId).toBe("BT24-062");
    expect(s.perm("master").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(neighborId);
    expect(s.perm("neighbor").stack.map((card) => card.instanceId)).toEqual([neighbor3Id]);
  });

  it("plays its stacked card at the end of a real opponent turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-062", as: "master", under: [{ card: "BT24-058", as: "stacked" }] }] },
        1: { security: ["BT1-013"], deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    const opponentTurn = s.engine.runOneTurn();
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("stacked").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("stacked").instanceId)).toBe(
      true,
    );
    expect(s.perm("master").stack.map((card) => card.instanceId)).not.toContain(s.inst("stacked").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("stacked").instanceId);
    await opponentTurn;
  });

  it("uses Blocker in a public battle and preserves security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-062", as: "blocker" }], security: [{ card: "BT1-013", as: "security" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const attackerId = s.perm("attacker").permanentId;
    const securityId = s.inst("security").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("attacker").instanceId);
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
  });

  it("locks the attack target through a public attack, unlike the unstacked host", async () => {
    const locked = setupEngine({
      0: {
        battleArea: [{ card: "BT10-028", as: "host", under: ["BT24-062"] }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "attacker" },
          { card: "BT1-031", as: "blocker" },
        ],
        security: [{ card: "BT1-013", as: "security" }],
      },
    });
    locked.state.turnSeat = 0;
    const securityId = locked.inst("security").instanceId;
    await locked.ready();
    expect(
      locked.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: locked.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => locked.events.some((event) => event.kind === "securityChecked") && !observe(locked.engine).isAttacking(),
    );
    expect(locked.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(locked.state.players[1]!.trash.map((card) => card.instanceId)).toContain(securityId);
    expect(locked.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      locked.perm("host").permanentId,
    );

    const open = setupEngine({
      0: { battleArea: [{ card: "BT10-028", as: "host" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "attacker" },
          { card: "BT1-031", as: "blocker" },
        ],
        security: [{ card: "BT1-013", as: "security" }],
      },
    });
    open.state.turnSeat = 0;
    await open.ready();
    expect(
      open.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: open.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => open.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      open.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: open.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(
      () => open.events.some((event) => event.kind === "combatResolved") && !observe(open.engine).isAttacking(),
    );
    expect(open.state.players[1]!.trash.map((card) => card.instanceId)).toContain(open.inst("blocker").instanceId);
    expect(open.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      open.perm("host").permanentId,
    );
  });

  it("inherited attack-target lock exists only during its owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-028", as: "host", under: ["BT24-062"] }] },
    });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(false);
  });
});
