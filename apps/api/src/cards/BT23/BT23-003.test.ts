import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT23-003.js";
import "./index.js";
import "../BT1/BT1-108.js";
import "../BT22/BT22-100.js";
import "./BT23-100.js";

describe("BT23-003 Motimon", () => {
  it("matches the catalog and carries the printed inherited contract", () => {
    expect(getCardDefinition("BT23-003")).toMatchObject({
      cardId: "BT23-003",
      nameEn: "Motimon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      attributes: ["-"],
      types: ["Lesser", "CS"],
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When any of your [CS]\u00a0trait Option cards are placed in the battle area, this Digimon may attack.",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOptionPlayed",
            sourceFilter: {
              controller: "mine",
              kind: ["Option"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
            actions: [
              {
                kind: "Attack",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                withoutSuspending: false,
                optional: true,
              },
            ],
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("may attack when its controller places a CS Option and triggers only once that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "motimonHost", dp: 20_000 }],
          hand: [
            { card: "BT23-100", as: "firstOption" },
            { card: "BT23-100", as: "secondOption" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          security: ["BT1-009", "BT1-013", "BT1-027", "BT1-028", "BT1-045"],
          battleArea: [
            { card: "BT1-009", as: "firstTarget", suspended: true },
            { card: "BT1-010", as: "secondTarget", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("firstOption").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("motimonHost").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.perm("motimonHost").isSuspended).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("motimonHost").permanentId]);
    const secondOptionId = s.inst("secondOption").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("secondOption").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === secondOptionId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === secondOptionId)).toBe(
      true,
    );
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(4);
    expect(s.perm("motimonHost").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(4);
  });

  it("does not trigger for a non-CS Option played through the public route", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "motimonHost" }],
          hand: [{ card: "BT1-108", as: "nonCsOption" }],
        },
        1: { security: ["BT1-009"], battleArea: [{ card: "BT1-009", as: "opponentTarget", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonCsOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT1-108"));

    expect(s.perm("motimonHost").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not trigger for a CS Option that is never placed in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "motimonHost" }],
          hand: [{ card: "BT22-100", as: "securityOption" }],
          security: [
            { card: "BT1-013", faceUp: false },
            { card: "BT1-027", faceUp: false },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const optionId = s.inst("securityOption").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT22-100"));

    // BT22-100's [Main] places it as the bottom SECURITY card, so the printed
    // "placed in the battle area" condition is never met.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(false);
    expect(s.perm("motimonHost").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("resets the inherited Option attack on the next own turn through the public turn loop", async () => {
    const deck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"];
    const s = setupEngine(
      {
        0: {
          deck,
          battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "host", dp: 20_000 }],
          hand: [
            { card: "BT23-100", as: "first" },
            { card: "BT23-100", as: "second" },
          ],
        },
        1: { deck, security: ["BT1-009", "BT1-013", "BT1-027", "BT1-028", "BT1-045"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(4);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger when the opponent plays a CS Option on their own turn", async () => {
    const deck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];
    const s = setupEngine(
      {
        0: {
          deck,
          hand: [{ card: "BT1-009" }],
          security: ["BT1-013", "BT1-027"],
          battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "motimonHost" }],
        },
        1: {
          deck,
          hand: [{ card: "BT23-100", as: "opponentCsOption" }],
          security: ["BT1-013", "BT1-027"],
          battleArea: [{ card: "BT22-044", as: "opponentCs" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    const optionId = s.inst("opponentCsOption").instanceId;
    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("motimonHost").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("allows the controller to refuse the optional attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "motimonHost" }],
          hand: [{ card: "BT23-100", as: "csOption" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const optionId = s.inst("csOption").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT23-100"));
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "cardPlayed", cardId: "BT23-100", seat: 0 }));
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "cardsMoved", instanceIds: [optionId], to: "battleArea" }),
    );

    expect(s.perm("motimonHost").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not react during the opponent's turn when its own CS Option enters from security", async () => {
    const deck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];
    const s = setupEngine(
      {
        0: {
          deck,
          hand: [{ card: "BT1-009" }],
          battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "motimonHost" }],
          security: ["BT23-100"],
        },
        1: {
          deck,
          hand: [{ card: "BT1-009" }],
          security: ["BT1-013", "BT1-027"],
          battleArea: [{ card: "BT1-010", as: "opponentAttacker", dp: 20_000 }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-100") &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.turnSeat).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("motimonHost").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly attacks after a CS Option is played", async () => {
    const deck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-043", under: ["BT23-003"], as: "attacker", dp: 20_000 }],
          hand: [
            { card: "BT23-100", as: "firstOption" },
            { card: "BT23-100", as: "secondOption" },
          ],
          deck,
        },
        1: {
          deck,
          security: ["BT1-009", "BT1-013", "BT1-027", "BT1-028", "BT1-045"],
          battleArea: [
            { card: "BT1-009", as: "firstTarget", suspended: true },
            { card: "BT1-010", as: "secondTarget", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT23-100")).toBe(true);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT23-100")).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly evolves a CS egg from breeding through the alternate recipe", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT23-003", as: "egg" }, hand: [{ card: "BT23-006", as: "host" }] },
    });
    await s.ready();
    s.state.memory = 0;
    const eggId = s.inst("egg").instanceId;
    const hostId = s.inst("host").instanceId;
    const permanentId = s.perm("egg").permanentId;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: hostId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === hostId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.permanentId).toBe(permanentId);
    expect(s.state.players[0]!.breeding?.stack[0]!.instanceId).toBe(eggId);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(hostId);
  });
});
