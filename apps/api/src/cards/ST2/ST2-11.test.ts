import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-11.js";

describe("ST2-11 MetalGarurumon", () => {
  it("matches the once-per-turn self-unsuspend contract", () => {
    const definition = getCardDefinition("ST2-11")!;
    const compiled = getCompiledCard("ST2-11")!;

    expect(definition.effectText).toContain("[Once Per Turn] Unsuspend this Digimon");
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenAttacking",
        actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
        frequency: "OncePerTurn",
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("unsuspends after attacking and may attack again", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "metalGarurumon" }], deck: ["BT1-030", "BT1-031", "BT1-032"] },
      1: { security: ["BT1-030", "BT1-031", "BT1-032"], deck: ["BT1-033", "BT1-034", "BT1-035"] },
    });
    const attackerId = s.perm("metalGarurumon").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.phase === Phase.Main &&
        !s.perm("metalGarurumon").isSuspended &&
        s.state.players[1]!.security.length === 2 &&
        !observe(s.engine).isAttacking(),
    );
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.phase === Phase.Main &&
        s.state.players[1]!.security.length === 1 &&
        s.perm("metalGarurumon").isSuspended,
    );
    expect(s.perm("metalGarurumon").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        !s.perm("metalGarurumon").isSuspended &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("metalGarurumon").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
