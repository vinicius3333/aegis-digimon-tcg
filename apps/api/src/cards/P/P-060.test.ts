import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-060.js";
import "./P-063.js";

describe("P-060 Angoramon", () => {
  it("gains 1 memory when its host attacks while Ruli is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-063" },
          { card: "BT10-051", as: "host", under: ["P-060"] },
        ],
      },
      1: { security: ["BT1-001"] },
    }, { autoDeclineOptional: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.memory === 4);

    expect(s.state.memory).toBe(4);
  });

  it("gains memory only once per turn across two attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-063" },
          { card: "BT10-051", as: "host", under: ["P-060"], dp: 9000 },
        ],
        hand: ["BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", suspended: true, dp: 1000 },
          { card: "BT1-010", as: "second", suspended: true, dp: 1000 },
        ],
      },
    }, { autoDeclineOptional: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("first").permanentId },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.memory === 4 &&
      s.state.players[1]!.battleArea.length === 1 &&
      s.events.filter((event) => event.kind === "combatResolved").length === 1 &&
      s.state.phase === Phase.Main &&
      s.state.turnSeat === 0 &&
      !observe(s.engine).isAttacking()
    );
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("second").permanentId },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.length === 0 &&
      s.events.filter((event) => event.kind === "combatResolved").length === 2 &&
      s.state.phase === Phase.Main &&
      s.state.turnSeat === 0 &&
      !observe(s.engine).isAttacking()
    );

    expect(s.state.memory).toBe(4);
  });
});
