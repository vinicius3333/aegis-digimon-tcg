import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-055.js";
import "./BT9-100.js";

describe("BT9 Grandis historical deck gauntlet", () => {
  it("chains the once-per-turn Grandis restand into Grandis Scissor's Digimon-only forced attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-055", as: "grandis", under: ["BT1-083"] }],
          hand: [{ card: "BT9-100", as: "scissor" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget", dp: 2000 },
            { card: "BT1-010", as: "secondTarget", dp: 2000 },
          ],
          security: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const grandis = s.perm("grandis");
    const firstTargetId = s.perm("firstTarget").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: grandis.permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.security.length === 1 &&
      !grandis.isSuspended &&
      !observe(s.engine).isAttacking()
    );
    expect(s.perm("firstTarget").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: grandis.permanentId,
      target: { kind: "permanent", permanentId: firstTargetId },
    })).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstTargetId) &&
      !observe(s.engine).isAttacking()
    );
    expect(grandis.isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("scissor").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.length === 0 &&
      s.state.players[0]!.trash.some((card) => card.cardId === "BT9-100") &&
      !observe(s.engine).isAttacking()
    );

    expect(grandis.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT9-100")).toBe(true);
  });
});
