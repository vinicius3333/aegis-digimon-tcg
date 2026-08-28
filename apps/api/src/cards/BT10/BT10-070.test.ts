import { describe, expect, it } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-070.js";

describe("BT10-070 Blastmon", () => {
  it("gains Blitz when played with at least three digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-070", as: "source", under: ["BT10-018", "BT10-019", "BT10-021"] }] },
    });
    const engine = s.engine as unknown as {
      fireTimingForInstance(timing: EffectTiming, instanceId: string): Promise<void>;
    };
    await engine.fireTimingForInstance(EffectTiming.OnPlay, s.perm("source").topCard.instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blitz")).toBe(true);
  });

  it("also gains Blitz with four digivolution cards (Q1994)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-070", as: "source", under: ["BT10-018", "BT10-019", "BT10-021", "BT10-022"] }] },
    });
    const engine = s.engine as unknown as {
      fireTimingForInstance(timing: EffectTiming, instanceId: string): Promise<void>;
    };

    await engine.fireTimingForInstance(EffectTiming.OnPlay, s.perm("source").topCard.instanceId);

    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blitz")).toBe(true);
  });

  it("pays one source to delete a level 4 attacker only once per opponent turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-070", as: "blastmon", under: ["BT1-009", "BT1-009"] }],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT4-011", as: "firstAttacker" },
            { card: "BT4-011", as: "secondAttacker" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const firstAttackerId = s.perm("firstAttacker").permanentId;
    const secondAttackerId = s.perm("secondAttacker").permanentId;
    preferred.push(firstAttackerId);
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 0;
    s.state.phase = Phase.Main;
    s.perm("firstAttacker").canAttackPlayer = true;
    s.perm("secondAttacker").canAttackPlayer = true;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: firstAttackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstAttackerId) &&
        s.state.players[0]!.trash.length === 1 &&
        s.state.phase === Phase.Main &&
        s.state.turnSeat === 1 &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.perm("blastmon").stack).toHaveLength(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: secondAttackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondAttackerId)).toBe(true);
    expect(s.perm("blastmon").stack).toHaveLength(1);
    // The first trigger trashes Blastmon's source; the later unchecked security card also
    // enters the same trash, so the owner's trash contains both cards.
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("does not delete an attacker when Blastmon has no source to pay the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-070", as: "blastmon" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT4-011", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 0;
    s.state.phase = Phase.Main;
    s.perm("attacker").canAttackPlayer = true;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
    // The attack still performs its security check; the revealed card is trashed even though
    // Blastmon cannot pay its optional source cost.
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
