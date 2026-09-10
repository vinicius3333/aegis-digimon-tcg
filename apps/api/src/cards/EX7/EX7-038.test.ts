import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-038.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-038 Gotsumon", () => {
  it("matches the catalog, complete IR, alternate route, and exclusive registration", () => {
    expect(getCardDefinition("EX7-038")).toMatchObject({
      cardId: "EX7-038",
      nameEn: "Gotsumon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 0 },
        { color: "Green", level: 2, memoryCost: 0 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Rock", "NSp"],
      effectText: "[Digivolve]Lv.2 w/[NSP] trait: Cost 0 \n\n＜Blocker＞.",
      inheritedEffectText: "＜Reboot＞.",
    });
    expect(digivolutionRequirementsFor("EX7-038")).toContainEqual({
      level: 2,
      traits: ["NSp"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled).toEqual({
      effects: [
        { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
        { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 2, traits: ["NSp"], cost: 0, isAlternate: true }],
    });
    expect(hasRegisteredCompiledCard("EX7-038")).toBe(true);
  });

  it("uses Blocker publicly to redirect and win an opponent's player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-038", as: "blocker", dp: 5000 }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("alternate-evolves from a blue NSp level 2 for 0 with exact draw and stack identity", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "P-148", as: "egg" },
        hand: [{ card: "EX7-038", as: "gotsu" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const eggId = s.inst("egg").instanceId;
    const gotsuId = s.inst("gotsu").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: gotsuId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === gotsuId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
  });

  it("rejects a red non-NSp level 2 without payment, draw, or stack mutation", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX7-001", as: "egg" },
        hand: [{ card: "EX7-038", as: "gotsu" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("gotsu").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").topCard.cardId).toBe("EX7-001");
    expect(s.perm("egg").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("passes inherited Reboot through public evolution and unsuspends during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-038", as: "base" }],
          hand: [{ card: "EX7-041", as: "host" }, "BT1-009"],
          deck: [{ card: "BT1-011", as: "drawn" }, "BT1-012"],
          security: ["BT1-009", "BT1-011"],
        },
        1: { deck: ["BT1-013", "BT1-014"], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
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
});
