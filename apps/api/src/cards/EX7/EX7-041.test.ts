import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-041.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-041 Tortomon", () => {
  it("matches the catalog, Q3851, complete IR, alternate route, and exclusive registration", () => {
    expect(getCardDefinition("EX7-041")).toMatchObject({
      cardId: "EX7-041",
      nameEn: "Tortomon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Reptile", "NSp"],
      effectText:
        "[Digivolve]Lv.3 w/[NSp]\u00a0trait: Cost 2 \n\n＜Blocker＞ \n[Opponent's Turn] Your opponent's effects can't delete this Digimon.",
      inheritedEffectText: "＜Reboot＞.",
    });
    expect(digivolutionRequirementsFor("EX7-041")).toContainEqual({
      level: 3,
      traits: ["NSp"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled).toEqual({
      effects: [
        { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
        {
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "protection",
              tokens: ["beDeletedByEffects"],
              duration: "permanent",
            },
          ],
        },
        {
          trigger: "Static",
          actions: [],
          isInherited: true,
          keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 3, traits: ["NSp"], cost: 2, isAlternate: true }],
    });
    expect(hasRegisteredCompiledCard("EX7-041")).toBe(true);
  });

  it("uses Blocker publicly to redirect and win an opponent's player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-041", as: "torto" }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("torto").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("rejects actual opponent-effect deletion during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-041", as: "torto" }] },
        1: { hand: [{ card: "EX7-012", as: "deletor" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deletor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX7-012"));
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX7-041"]);
  });

  it("alternate-evolves from an off-color NSp level 3 for exactly 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-015", as: "base" }],
        hand: [{ card: "EX7-041", as: "torto" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const tortoId = s.inst("torto").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: tortoId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === tortoId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("rejects an off-color non-NSp level 3 without mutating state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "EX7-041", as: "torto" }],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("torto").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("passes inherited Reboot through public evolution and unsuspends on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-041", as: "base" }],
          hand: [{ card: "BT10-064", as: "host" }, "BT1-009"],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-011"],
        },
        1: { deck: ["BT1-013", "BT1-014"], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    const baseId = s.inst("base").instanceId;
    const hostId = s.inst("host").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: hostId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === hostId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("base").isSuspended);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("base").isSuspended).toBe(false);
    await stopLoop(s, loop, 1);
  });

  it("is still deleted by rule processing at zero or lower DP during the opponent's turn (Q3851)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-041", as: "torto" }] },
        1: {
          hand: [
            { card: "EX7-026", as: "first" },
            { card: "EX7-026", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    s.state.memory = 10;
    const cardId = s.perm("torto").topCard!.instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("torto").currentDP === 1000);
    expect(s.perm("torto").currentDP).toBe(1000);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(cardId);
  });
});
