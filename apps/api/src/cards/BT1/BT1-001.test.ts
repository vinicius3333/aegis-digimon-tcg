import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-001.js";
import "./BT1-072.js";

describe("BT1-001 Yokomon", () => {
  it("matches the catalog and exports its inherited attack-target effect", () => {
    expect(getCardDefinition("BT1-001")).toMatchObject({
      cardId: "BT1-001",
      nameEn: "Yokomon",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      types: ["Bulb"],
      inheritedEffectText:
        "[When Attacking] When you attack an opponent's Digimon， this Digimon gets +1000 DP for the turn.",
    });
    expect(getCardDefinition("BT1-001")?.effectText).toBeUndefined();
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenAttacking",
        isInherited: true,
        condition: { kind: "attackTargetMatchesFilter", filter: { controller: "opponent", kind: ["Digimon"] } },
        actions: [
          {
            kind: "ModifyDP",
            amount: 1000,
            duration: "forTheTurn",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gives +1000 DP when its Digimon attacks an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "attacker", under: ["BT1-001"] }] },
      1: { battleArea: [{ card: "BT1-020", as: "defender", dp: 6500, suspended: true }] },
    });
    const defenderInstanceId = s.perm("defender").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === defenderInstanceId));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("attacker").currentDP).toBe(7000);
  });

  it("does not gain DP in a security battle", async () => {
    const s = setupEngine({
      // A plain host carrying Yokomon ties the 6000-DP Security Digimon and is deleted. If
      // the inherited effect incorrectly fires for a player attack, 7000 DP would survive.
      0: { battleArea: [{ card: "BT1-019", as: "attacker", under: ["BT1-001"] }] },
      1: { security: ["BT1-020"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
  });

  it("does not gain DP when a player attack is redirected by Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "attacker", under: ["BT1-001"] }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-010"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
  });

  it("carries the inherited boost through hatch, breeding digivolve, and move beside a source-less peer", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-001", as: "egg" }],
          battleArea: [{ card: "BT1-013", as: "peer" }],
          hand: [{ card: "BT1-013", as: "muchomon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "peerTarget", dp: 5500, suspended: true },
            { card: "BT1-020", as: "carrierTarget", dp: 5500, suspended: true },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-001");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("muchomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-013");
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    await advance(s.engine).waitForMainPhase(0);
    const carrier = s.state.players[0]!.battleArea.find(({ stack }) =>
      stack.some(({ instanceId }) => instanceId === eggInstanceId),
    )!;
    expect(carrier.topCard?.cardId).toBe("BT1-013");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(carrier.currentDP).toBe(carrier.baseDP);

    // The opponent's turn-start unsuspends both targets. Re-suspend them so the following
    // attack declarations are legal; otherwise the public attack intent returns illegal-target.
    expect(s.perm("peerTarget").isSuspended).toBe(false);
    expect(s.perm("carrierTarget").isSuspended).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("peerTarget").permanentId, s.perm("carrierTarget").permanentId]);

    // The source-less peer has only 5000 DP and cannot defeat a 5500-DP target.
    const peerPermanentId = s.perm("peer").permanentId;
    const peerTargetPermanentId = s.perm("peerTarget").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: peerPermanentId,
        target: { kind: "permanent", permanentId: peerTargetPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === peerPermanentId));
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === peerTargetPermanentId)).toBe(true);

    // The real BT1-001 stack attacks the other opposing Digimon: 5000 + 1000 defeats 5500.
    const carrierTargetInstanceId = s.perm("carrierTarget").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrier.permanentId,
        target: { kind: "permanent", permanentId: s.perm("carrierTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === carrierTargetInstanceId));
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === carrier.permanentId)).toBe(true);
    expect(carrier.currentDP).toBe(6000);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
