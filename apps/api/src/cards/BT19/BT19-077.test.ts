import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./BT19-077.js";

describe("BT19-077 Calumon", () => {
  it("compiles the security play, the suspend-cost reduced digivolve, the [All Turns] lock, and security recovery", () => {
    const card = runtimeCompiledCard("BT19-077");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Security",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: { filter: { controller: "mine", kind: ["Digimon"], dp: { op: "lte", value: 2000 } } },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "Digivolve",
            from: ["hand"],
            payCost: true,
            reduceCost: 2,
            cost: { kind: "suspend", target: { isSelf: true } },
          },
        ],
      },
      { trigger: "AllTurns", actions: [{ kind: "Restrict", restriction: "attackOrBlock", duration: "permanent" }] },
      { trigger: "OnDeletion", actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: true }] },
    ]);
  });

  it("is treated as having no level, so the battle-area rule sweep leaves it alone (CR 2-9-2)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-077", as: "calumon" }], deck: ["BT1-010"], security: ["BT1-009", "BT1-013"] },
      1: { deck: ["BT1-010", "BT1-011"], security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 3;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    expect(s.perm("calumon").topCard?.cardId).toBe("BT19-077");
    expect(s.perm("calumon").currentDP).toBe(1000);
    drive.endMainPhaseIfOpen(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays a 2000-DP-or-less Digimon free from the security check, then battles the attacker (Q6243)", async () => {
    let memoryAtPlay: number | undefined;
    let memoryBeforeCheck: number | undefined;
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT19-077", as: "calumon" }, "BT1-009", "BT1-013"],
          hand: [
            { card: "BT1-012", as: "eligible" },
            { card: "BT1-009", as: "tooBig" },
          ],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-011", as: "attacker" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent(event) {
          if (event.kind === "cardPlayed" && event.cardId === "BT1-012") memoryAtPlay = s.state.memory;
        },
      },
    );
    s.state.memory = 0;
    await s.ready();
    const calumonInstanceId = s.inst("calumon").instanceId;

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    memoryBeforeCheck = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 40);

    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT1-012"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(memoryAtPlay).toBe(memoryBeforeCheck);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([calumonInstanceId]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("suspends itself to digivolve another Digimon from hand for 2 less, keeping the base stack", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-077", as: "calumon" },
            { card: "BT1-014", as: "base", under: [{ card: "BT1-009", as: "older" }] },
          ],
          hand: [{ card: "BT1-024", as: "metal" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 3;
    await s.ready();
    preferInstanceIds.push(s.perm("base").topCard!.instanceId, s.inst("metal").instanceId);
    const baseInstanceId = s.inst("base").instanceId;
    const olderInstanceId = s.inst("older").instanceId;

    const entries = JSON.parse(s.perm("calumon").activatableEffectsJson ?? "[]") as { effectKey: string }[];
    expect(entries).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("calumon").topCard!.instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT1-024");
    await settle(() => false, 30);

    expect(s.perm("calumon").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").currentDP).toBe(10000);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([olderInstanceId, baseInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    const again = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("calumon").topCard!.instanceId,
      effectKey: entries[0]!.effectKey,
    });
    expect(again.ok).toBe(false);
  });

  it("refuses a real attack declaration while an unrestricted peer of the same board may attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-077", as: "calumon" },
          { card: "BT1-009", as: "peer" },
        ],
        deck: ["BT1-010"],
        security: ["BT1-009", "BT1-013"],
      },
      1: { security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("calumon"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("calumon"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("peer"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("peer"), "block")).toBe(false);

    const refused = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("calumon").permanentId,
      target: { kind: "player" },
    });
    expect(refused.ok).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("calumon").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("peer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("refuses a real block declaration in the opponent's open block window", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-077", as: "calumon" },
          { card: "EX6-012", as: "blocker" },
        ],
        deck: ["BT1-010"],
        security: ["BT1-009", "BT1-013"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker" }],
        deck: ["BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-013"],
      },
    });
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    const refused = s.engine.applyIntent(0, {
      type: "declareBlock",
      blockerPermanentId: s.perm("calumon").permanentId,
    });
    expect(refused.ok).toBe(false);

    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.perm("calumon").topCard?.cardId).toBe("BT19-077");
    expect(s.perm("calumon").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("returns to the top of its owner's security stack when deleted in a real opponent-turn battle", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-077", as: "calumon" },
            { card: "BT1-014", as: "base" },
          ],
          hand: [{ card: "BT1-024", as: "metal" }],
          deck: ["BT1-010", "BT1-011"],
          security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "killer" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 3;
    await s.ready();
    preferInstanceIds.push(s.perm("base").topCard!.instanceId, s.inst("metal").instanceId);
    const calumonInstanceId = s.inst("calumon").instanceId;
    const topSecurityId = s.inst("topSecurity").instanceId;

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);

    const entries = JSON.parse(s.perm("calumon").activatableEffectsJson ?? "[]") as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("calumon").topCard!.instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("calumon").isSuspended);
    drive.endMainPhaseIfOpen(0);

    await drive.waitForMainPhase(1);
    expect(s.perm("calumon").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("killer").permanentId,
        target: { kind: "permanent", permanentId: s.perm("calumon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === calumonInstanceId));
    await settle(() => false, 30);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      calumonInstanceId,
      topSecurityId,
      expect.any(String),
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(calumonInstanceId);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT1-024"]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
