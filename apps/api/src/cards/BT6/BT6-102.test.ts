import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-102.js";

describe("A3 BT6-102 — granted '[On Deletion] Lose 2 memory'", () => {
  it("POSITIVE: deleting the granted opponent Digimon costs 2 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", dp: 3000 }],
          hand: [{ card: "BT6-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const option = s.inst("option");
    const recipient = s.perm("recipient");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.memory = 5;
    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(
      () =>
        !p0.hand.some((c) => c.instanceId === option.instanceId) &&
        engine.continuous.listCustomEffectGrants().length > 0,
      400,
    );

    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g: { instanceId: string; token: string }) =>
          g.instanceId === recipient.topCard!.instanceId && g.token === "[On Deletion] Lose 2 memory",
      ),
    ).toBe(true);

    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => !p1.battleArea.some((p) => p.permanentId === recipient.permanentId));

    expect(s.state.memory).toBe(7);
  });

  it("NEGATIVE: a Digimon that never received the grant costs nothing on deletion", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT6-102", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "recipient" },
            { card: "BT1-014", dp: 4000, as: "bystander" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
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

describe("BT6-102 Tropical Venom — KB Q&A rulings", () => {
  it("makes the opponent lose 2 memory, so the user gains 2, when the granted Digimon is deleted (Q1488)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-064"], hand: [{ card: "BT6-102", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "recipient" },
            { card: "BT1-014", as: "bystander" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.state.players[1]!;
    const recipient = s.perm("recipient");
    const bystander = s.perm("bystander");
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(3);

    const grants = (
      s.engine as unknown as {
        continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
      }
    ).continuous.listCustomEffectGrants();
    expect(grants.map((grant) => [grant.instanceId, grant.token])).toEqual([
      [recipient.topCard!.instanceId, "[On Deletion] Lose 2 memory"],
    ]);

    await advance(s.engine).verb.deletePermanent([bystander.permanentId], "byEffect");
    await settle(() => !opponent.battleArea.some((permanent) => permanent.permanentId === bystander.permanentId));
    expect(s.state.memory).toBe(3);

    await advance(s.engine).verb.deletePermanent([recipient.permanentId], "byEffect");
    await settle(() => s.state.memory === 5);
    expect(s.state.memory).toBe(5);
  });
});
