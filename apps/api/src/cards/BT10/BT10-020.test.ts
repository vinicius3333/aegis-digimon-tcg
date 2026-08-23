import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-020.js";

describe("BT10-020 Deckerdramon", () => {
  it("draws one plus one for each opposing Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT10-020", as: "source" }], deck: ["BT10-017", "BT10-018", "BT10-019"] },
      1: { battleArea: ["BT10-029", "BT10-030"] },
    });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.deck.length === 0);
    expect(player.hand).toHaveLength(3);
  });

  it("does not grant inherited DP below the 2-Digimon threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-019", as: "host", under: ["BT10-020"] }] },
      1: { battleArea: ["BT10-018"] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("grants inherited +1000 DP at exactly 2 opposing Digimon on both turns", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-019", as: "host", under: ["BT10-020"] }] },
      1: { battleArea: ["BT10-018", "BT10-019"] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);

    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("may Save itself under a Tamer when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-087", as: "tamer" },
            { card: "BT10-020", as: "source" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const sourceId = s.perm("source").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId])).toBe(1);
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === sourceId));

    expect(s.perm("tamer").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sourceId)).toBe(false);
  });
});
