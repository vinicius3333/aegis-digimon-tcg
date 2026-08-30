import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-068.js";
// Self-register every card module so the engine drives the REGISTERED BT15-068 IR.
import "../index.js";

/**
 * A3 — Q1f: BT15-068 (Purple Digimon) "[On Play] Until the end of your opponent's turn, 1 of
 * their Digimon gains '[On Deletion] Lose 1 memory.'"
 *
 * Same Q1f malformed-shape gap as BT6-102/BT11-106 (see BT6-102's header for the full writeup).
 * This card proves the SHARED "[On Deletion] Lose 1 memory." library entry — the same literal
 * token BT20-065 and BT9-014 also grant — fires correctly from an [On Play] trigger (rather than
 * an Option's [Main]), reusing exactly one library entry across three cards.
 *
 * FAILS-WHEN-REVERTED: reverting the interpreter's routing branch or the library entry makes
 * the grant either throw when the recipient is deleted, or silently install nothing.
 */

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
          security: ["BT1-001"],
        },
        1: {
          trash: [{ card: "BT1-009", as: "playedByEffect" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("playedByEffect").instanceId)).toBe(
      true,
    );
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

    s.state.memory = 5; // isolate the granted effect's delta from the play's own memory cost

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === recipient.permanentId));

    expect(s.state.memory).toBe(6); // 5 + 1 (opponent-owned recipient: seat-relative -1 => +1)
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

    // Never play BT15-068 — no grant is ever installed on anyone.
    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([bystander.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === bystander.permanentId));

    expect(s.state.memory).toBe(5);
  });
});
