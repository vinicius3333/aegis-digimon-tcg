import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST7/ST7-08.js";
import "./BT12-045.js";
import "../index.js";

describe('A3 BT12-105 — granted "[On Deletion] Trash the top card of your security stack."', () => {
  it("registers the printed Security activation", () => {
    const module = getEffectModule("BT12-105");
    const source = { instanceId: "source-105", cardId: "BT12-105", ownerSeat: 0, isOnBattleArea: () => false } as never;
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("POSITIVE: deleting the granted opponent Digimon trashes the top of ITS OWN controller's security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-105", as: "spikingStrike" }],
          battleArea: [{ card: "AD1-011", dp: 2000, as: "colorSource" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "recipient" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const spikingStrike = s.inst("spikingStrike");
    const recipient = s.perm("recipient");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: spikingStrike.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => engine.continuous.listCustomEffectGrants().length > 0, 3000);

    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g) =>
          g.instanceId === recipient.topCard!.instanceId &&
          g.token === "[On Deletion] Trash the top card of your security stack.",
      ),
    ).toBe(true);

    const securityBefore = p1.security.length;

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === recipient.permanentId));
    await settle(() => p1.security.length < securityBefore, 400);

    expect(p1.security.length).toBe(securityBefore - 1);
  });

  it("NEGATIVE: a Digimon that never received the grant costs no security on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-105", as: "spikingStrike" }],
          battleArea: [{ card: "AD1-011", dp: 2000, as: "colorSource" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "recipient" },
            { card: "BT1-014", dp: 4000, as: "bystander" },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const bystander = s.perm("bystander");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.turnSeat = 0;

    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    const securityBefore = p1.security.length;

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([bystander.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === bystander.permanentId));

    expect(p1.security.length).toBe(securityBefore);
  });
});

describe("BT12-105 Spiking Strike — KB Q&A rulings", () => {
  async function attackAfterWhenAttackingDeletion(options: { granted: boolean }) {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-105", as: "spikingStrike" }],
          battleArea: [
            { card: "ST7-08", as: "warGrowlmon" },
            { card: "BT12-045", as: "greenSource" },
          ],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "recipient" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const recipientInstanceId = s.perm("recipient").topCard.instanceId;
    const optionPlay = options.granted
      ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("spikingStrike").instanceId })
      : undefined;
    await settle(() => !options.granted || observe(s.engine).customEffectGrants(s.perm("recipient")).length > 0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("warGrowlmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "gameOver") ||
        (!observe(s.engine).isAttacking() &&
          s.state.players[1]!.trash.some(({ instanceId }) => instanceId === recipientInstanceId)),
    );
    return { s, optionPlay };
  }

  it("wins when a [When Attacking] deletion of the granted Digimon trashes the last security card before the check (Q2241)", async () => {
    const { s: granted, optionPlay } = await attackAfterWhenAttackingDeletion({ granted: true });
    expect(optionPlay).toEqual({ ok: true });
    expect(granted.state.players[1]!.security).toHaveLength(0);
    expect(granted.events).toContainEqual(
      expect.objectContaining({ kind: "gameOver", result: { outcome: "win", winnerSeat: 0 } }),
    );

    const { s: control } = await attackAfterWhenAttackingDeletion({ granted: false });
    expect(control.state.players[1]!.security).toHaveLength(0);
    expect(control.events.some((event) => event.kind === "gameOver")).toBe(false);
  });
});
