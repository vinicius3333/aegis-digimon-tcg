import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-025.js";

describe("BT11-025 Gaogamon", () => {
  it("matches the catalog and carries both complete attack watchers", () => {
    expect(getCardDefinition("BT11-025")).toMatchObject({
      cardId: "BT11-025",
      nameEn: "Gaogamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Beast"],
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAttacking" }] },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [{ kind: "Return" }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("evolves from blue level 3 for 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-020", as: "base" }], hand: [{ card: "BT11-025", as: "gaogamon" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-025");
    expect(s.state.memory).toBe(2);
  });
  it("gains memory from public attacks once per turn and resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-025", as: "gaogamon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget", suspended: true },
            { card: "BT1-009", as: "secondTarget", suspended: true },
            { card: "BT1-009", as: "thirdTarget", suspended: true },
          ],
          hand: Array.from({ length: 8 }, () => "BT1-009"),
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const gaogamonId = s.perm("gaogamon").permanentId;
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    const thirdTargetId = s.perm("thirdTarget").permanentId;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: gaogamonId,
        target: { kind: "permanent", permanentId: firstTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== firstTargetId));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(4);

    await advance(s.engine).verb.unsuspend([gaogamonId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: gaogamonId,
        target: { kind: "permanent", permanentId: secondTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== secondTargetId));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.suspend([thirdTargetId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: gaogamonId,
        target: { kind: "permanent", permanentId: thirdTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== thirdTargetId));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("does not gain memory below the 8-card threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-025", as: "gaogamon" }] },
      1: { hand: Array.from({ length: 7 }, () => "BT1-009") },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("gaogamon").permanentId });

    expect(s.state.memory).toBe(0);
  });

  it("inherited effect returns exact level 3 targets from public attacks, once per turn and again next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST2-08", as: "host", under: ["BT11-025"] },
            { card: "BT1-013", as: "spare" },
            { card: "BT1-086", as: "tamer" },
          ],
          hand: [{ card: "BT11-025", as: "unused" }],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT11-023", as: "target", suspended: true },
            { card: "BT1-009", as: "battleVictim", suspended: true },
            { card: "BT11-023", as: "secondBounce", suspended: true },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          security: Array.from({ length: 3 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const hostId = s.perm("host").permanentId;
    const targetId = s.perm("target").permanentId;
    const battleVictimId = s.perm("battleVictim").permanentId;
    const secondBounceId = s.perm("secondBounce").permanentId;
    const targetInstanceId = s.inst("target").instanceId;
    const secondBounceInstanceId = s.inst("secondBounce").instanceId;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === targetInstanceId));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId)).toBe(false);

    await advance(s.engine).verb.unsuspend([hostId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: battleVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== battleVictimId));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(10);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondBounceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === secondBounceInstanceId));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
