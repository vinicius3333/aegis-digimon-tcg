import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-068.js";
import "../index.js";

describe("A3 BT15-068 — granted '[On Deletion] Lose 1 memory.'", () => {
  it("watches only effect-played opponent Digimon in the battle area", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
            zone: "battleArea",
            byEffect: true,
          },
        },
      ],
    }));

  it("gains memory when a natural effect plays an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-078", as: "attacker", under: ["BT15-068", "BT15-072"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          trash: [
            { card: "BT1-009", as: "playedByEffect" },
            { card: "BT1-009", as: "secondPlayedByEffect" },
            { card: "BT1-009", as: "nextPlayedByEffect" },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && !observe(s.engine).isAttacking());

    expect(
      s.state.players[1]!.battleArea.some((card) => card.topCard.instanceId === s.inst("playedByEffect").instanceId),
    ).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(1);
    expect(
      s.state.players[1]!.battleArea.some(
        (card) => card.topCard.instanceId === s.inst("secondPlayedByEffect").instanceId,
      ),
    ).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && !observe(s.engine).isAttacking());
    expect(
      s.state.players[1]!.battleArea.some(
        (card) => card.topCard.instanceId === s.inst("nextPlayedByEffect").instanceId,
      ),
    ).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("POSITIVE: deleting the granted opponent Digimon costs 1 memory", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-068", as: "gizamon" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const gizamon = s.inst("gizamon");
    const recipient = s.perm("recipient");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.memory = 5;
    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: gizamon.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => engine.continuous.listCustomEffectGrants().length > 0, 3000);

    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g: { instanceId: string; token: string }) =>
          g.instanceId === recipient.topCard!.instanceId && g.token === "[On Deletion] Lose 1 memory.",
      ),
    ).toBe(true);

    s.state.memory = 5;

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === recipient.permanentId));

    expect(s.state.memory).toBe(6);
  });

  it("NEGATIVE: a Digimon that never received the grant costs nothing on deletion", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-068", as: "gizamon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "recipient" },
            { card: "BT1-014", dp: 4000, as: "bystander" },
          ],
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

    s.state.memory = 5;
    s.state.turnSeat = 0;

    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([bystander.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === bystander.permanentId));

    expect(s.state.memory).toBe(5);
  });
});
