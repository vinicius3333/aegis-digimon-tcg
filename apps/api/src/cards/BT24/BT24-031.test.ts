import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_031 } from "./BT24-031.js";
import "../index.js";

describe("BT24-031 Elecmon", () => {
  it("recovers only after the optional top-security add leaves zero security", () => {
    const inherited = BT24_031.effects?.find((entry) => entry.isInherited);
    const recovery = inherited?.actions?.[1] as any;
    expect(recovery).toMatchObject({ kind: "SecurityManipulation", op: "addTop", source: "deck" });
    expect(recovery.condition).toMatchObject({
      kind: "zoneCount",
      seat: "mine",
      zone: "security",
      op: "lte",
      value: 0,
    });
  });
  it("reveals the two printed search pools on play", () => {
    const reveal = BT24_031.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0] as any;
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(reveal.add).toHaveLength(2);
  });

  it("adds distinct Iliad and TS cards from the top three and bottoms the miss", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-031", as: "elecmon" }],
          deck: [
            { card: "BT24-102", as: "iliad" },
            { card: "BT24-083", as: "ts" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("elecmon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("iliad").instanceId, s.inst("ts").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("resolves the Iliad/TS search through a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-031", as: "elecmon" }],
          deck: [
            { card: "BT24-102", as: "iliad" },
            { card: "BT24-083", as: "ts" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("elecmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("iliad").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("iliad").instanceId, s.inst("ts").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("may recover from the deck while starting at zero security (Q5611)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT24-031"] }],
          deck: [{ card: "BT1-009", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("adds the top security to hand, recovers, and does not repeat in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT24-031"] }],
          security: [{ card: "BT1-009", as: "added" }],
          deck: [
            { card: "BT1-010", as: "recovered" },
            { card: "BT1-011", as: "unused" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("added").instanceId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("unused").instanceId]);
  });

  it("resolves inherited security manipulation through a public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT24-031"] }],
          security: [{ card: "BT1-009", as: "added" }],
          deck: [{ card: "BT1-010", as: "recovered" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("added").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
  });

  it("recovers at zero security even when the optional add-to-hand action is declined (Q5611)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT24-031"] }],
          deck: [{ card: "BT1-009", as: "recovered" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
  });

  it("publicly recovers from deck at zero security after a completed attack (Q5611)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT24-031"], dp: 20_000 }],
          deck: [{ card: "BT1-009", as: "recovered" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("publicly declines security removal at one security without recovering (Q5611)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT24-031"], dp: 20_000 }],
          security: [{ card: "BT1-010", as: "kept" }],
          deck: [{ card: "BT1-009", as: "recovered" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
  });

  it("publicly takes one of two security cards without recovering (Q5611)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT24-031"], dp: 20_000 }],
          security: [
            { card: "BT1-010", as: "added" },
            { card: "BT1-011", as: "kept" },
          ],
          deck: [{ card: "BT1-009", as: "recovered" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("added").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
  });

  it("suppresses a second public security manipulation and resets on the next owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT24-031"], dp: 20_000 }],
          hand: [{ card: "BT24-050", as: "unsuspender" }],
          security: [{ card: "BT1-010", as: "firstSecurity" }],
          deck: [
            { card: "BT1-009", as: "firstRecovery" },
            { card: "BT1-011", as: "normalDraw" },
            { card: "BT1-011", as: "secondRecovery" },
            "BT1-012",
            "BT1-013",
          ],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length >= 1 && !observe(s.engine).isAttacking(),
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("firstSecurity").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("firstRecovery").instanceId]);
    expect(s.state.players[0]!.security.every((card) => card.faceUp === false)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length >= 2 && !observe(s.engine).isAttacking(),
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("firstRecovery").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("secondRecovery").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length >= 3 && !observe(s.engine).isAttacking(),
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("normalDraw").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("firstRecovery").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secondRecovery").instanceId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("digivolves from a level 2 TS Digi-Egg for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-002", as: "base" },
        hand: [{ card: "BT24-031", as: "elecmon" }],
        deck: [{ card: "BT1-009", as: "bonusDraw" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("elecmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("elecmon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("elecmon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("digivolves through the normal yellow level-2 route for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-006", as: "base" },
        hand: [{ card: "BT24-031", as: "elecmon" }],
        deck: [{ card: "BT1-010", as: "bonusDraw" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("elecmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("elecmon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("elecmon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("rejects both evolution routes from a blue non-TS Digi-Egg without moving cards", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "base" },
        hand: [{ card: "BT24-031", as: "elecmon" }],
        deck: [{ card: "BT1-009", as: "draw" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const normal = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("elecmon").instanceId,
    });
    expect(normal.ok).toBe(false);
    const alternate = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("elecmon").instanceId,
      useAlternateCost: true,
      alternateRequirementIndex: 0,
    });
    expect(alternate.ok).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("elecmon").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("draw").instanceId]);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("base").instanceId);
  });
});
