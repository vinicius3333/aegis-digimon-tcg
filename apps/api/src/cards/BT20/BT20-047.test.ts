import { advance } from "../../engine/testkit/advance.js";
import { Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-047.js";
import "./index.js";

describe("BT20-047 Solarmon", () => {
  it("has Blocker as a main effect and Reboot as an inherited effect", () => {
    expect(compiled.effects.find((effect) => !effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("evolves for 0 and may block an opposing attack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT20-005", as: "base" },
        hand: [{ card: "BT20-047", as: "solarmon" }],
        security: ["BT1-011"],
        deck: ["BT1-010", "BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "attacker" }],
        hand: ["BT1-010"],
        deck: ["BT1-010", "BT1-010"],
      },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("solarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-047");
    expect(s.state.memory).toBe(0);

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("base").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("is publicly playable for its catalog cost and enters with Blocker", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT20-047", as: "solarmon" }], deck: ["BT1-010", "BT1-010"] },
      1: { deck: ["BT1-010", "BT1-010"] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("solarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-047"));
    expect(s.state.memory).toBe(7);
    expect(observe(s.engine).hasKeyword(s.perm("solarmon"), "Blocker")).toBe(true);
  });

  it("grants Reboot only from its inherited position and unsuspends the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-050", under: ["BT20-047"], suspended: true, as: "host" },
          { card: "BT20-047", as: "standalone" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Reboot")).toBe(false);

    const unsuspendedIds = await (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("host").permanentId);
  });

  it("unsuspends only an inherited Reboot host through the real opponent Active phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-050", under: ["BT20-047"], suspended: true, as: "host" },
          { card: "BT20-047", suspended: true, as: "standalone" },
        ],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
      1: { deck: ["BT1-010", "BT1-010", "BT1-010"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main && !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("standalone").isSuspended).toBe(true);
    await (async () => {
      for (let i = 0; i < 5000 && s.state.phase !== Phase.Main; i += 1) await Promise.resolve();
      if (s.state.phase === Phase.Main) s.engine.applyIntent(1, { type: "endPhase" });
    })();
    await turn;
  });
});
