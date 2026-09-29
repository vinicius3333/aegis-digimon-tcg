import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-091.js";
import "./BT7-071.js";

describe("BT7-091 Koichi Kimura", () => {
  it("draws one card and then trashes one card from hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-091", as: "source" },
            { card: "BT7-092", as: "discard" },
          ],
          deck: [{ card: "BT7-093", as: "drawn" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const player = s.state.players[0] as PlayerState;
    preferred.push(s.inst("discard").instanceId);
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.trash.some((c) => c.instanceId === s.inst("discard").instanceId));
    expect(player.hand.some((c) => c.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});

describe("BT7-091 Koichi Kimura — KB Q&A rulings", () => {
  it("activates its inherited [On Deletion] once a Digimon digivolves onto this Tamer and is deleted (Q1665)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-091", as: "koichi" }],
          hand: [{ card: "BT7-071", as: "loweemon" }],
          deck: ["BT7-092", "BT7-093"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "stronger", suspended: true, dp: 7000 }],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    await s.ready();
    const koichiInstanceId = s.inst("koichi").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koichi").permanentId,
        instanceId: s.inst("loweemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT7-071" && s.state.memory === 1);
    expect(s.perm("koichi").stack.map((card) => card.instanceId)).toContain(koichiInstanceId);
    expect(s.state.memory).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("koichi").permanentId,
        target: { kind: "permanent", permanentId: s.perm("stronger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.battleArea.length === 0 && s.state.memory === 2);

    expect(player.battleArea).toHaveLength(0);
    expect(player.trash.map((card) => card.instanceId)).toContain(koichiInstanceId);
    expect(s.state.memory).toBe(2);
  });
});
