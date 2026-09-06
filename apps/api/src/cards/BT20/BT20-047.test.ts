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
        battleArea: [{ card: "BT20-005", as: "base" }],
        hand: [{ card: "BT20-047", as: "solarmon" }],
        security: ["BT1-011"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "attacker" }],
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
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);

    s.state.turnSeat = 1;
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

  it("unsuspends an inherited Reboot host through the real Active phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-050", under: ["BT20-047"], suspended: true, as: "host" }],
        hand: [{ card: "BT20-001", as: "playable" }],
        deck: ["BT20-001", "BT20-001", "BT20-001"],
      },
      1: { deck: ["BT20-001", "BT20-001"] },
    });
    await s.ready();
    s.state.turnSeat = 0;
    const turn = s.engine.runOneTurn();
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    await (async () => {
      for (let i = 0; i < 5000 && s.state.phase !== Phase.Main; i += 1) await Promise.resolve();
      if (s.state.phase === Phase.Main) s.engine.applyIntent(0, { type: "endPhase" });
    })();
    await turn;
  });
});
