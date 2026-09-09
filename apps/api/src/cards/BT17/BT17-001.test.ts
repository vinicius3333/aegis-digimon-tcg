import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-001.js";

describe("BT17-001 Gigimon", () => {
  it("exports the inherited paid deletion contract", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "Delete",
            cost: expect.objectContaining({ kind: "payMemory", memory: 1 }),
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
              count: 1,
            },
            condition: expect.objectContaining({
              kind: "opponentHas",
              filter: { zone: "battleArea", controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
            }),
          }),
        ],
      }),
    );
  });

  it("pays 1 memory and deletes an opposing 3000 DP Digimon when its host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-007", under: ["BT17-001"], as: "host" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "effectTarget" },
          { card: "AD1-003", as: "battleTarget", suspended: true },
        ],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const effectTargetInstanceId = s.perm("effectTarget").topCard!.instanceId;
    const battleTargetPermanentId = s.perm("battleTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === effectTargetInstanceId));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === battleTargetPermanentId)).toBe(
      true,
    );
  });

  it("does not pay memory or delete when the opponent has no Digimon at 3000 DP or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-007", under: ["BT17-001"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-014", as: "target" }], security: ["BT1-009"] },
    });
    s.state.memory = 2;
    await s.ready();
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(false);
  });

  it("carries the inherited deletion through the real Digi-Egg route: hatch -> digivolve -> battle area", async () => {
    // Peer/stack case. Every zone change is a public intent: `hatchEgg` takes BT17-001 off the
    // egg deck in the production Breeding window, the Red Lv.3 BT17-007 digivolves onto it in
    // the breeding area (Lv.2 Red, cost 0), `moveFromBreeding` carries the stack into the
    // battle area on the next own turn, and only then does the inherited [When Attacking]
    // clause fire from under the real host — hitting the 3000 DP peer while the 4000 DP peer
    // beside it is left alone.
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT17-001", as: "egg" }],
          hand: [{ card: "BT17-007", as: "agumon" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "weakPeer" },
            { card: "BT1-014", as: "strongPeer" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-012", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    // Turn 1 (seat 0): hatch.
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT17-001");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    // Digivolve onto the egg inside the breeding area; the egg becomes the stack.
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("agumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT17-007");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    // Turn 3 (seat 0): move the raised stack into the battle area.
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard!.cardId).toBe("BT17-007");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    const weakInstanceId = s.perm("weakPeer").topCard!.instanceId;
    const strongPermanentId = s.perm("strongPeer").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrier.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === weakInstanceId));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([strongPermanentId]);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
