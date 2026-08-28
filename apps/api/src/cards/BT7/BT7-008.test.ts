import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-008.js";

describe("BT7-008 Flamemon", () => {
  it("may play Takuya from hand when its host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-010", under: ["BT7-001", "BT7-008"], as: "host" }],
          hand: [{ card: "BT7-085", as: "takuya" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("takuya").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("takuya").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("adds an eligible Hybrid, Susanoomon or Takuya card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-008", as: "source" }],
          deck: [{ card: "BT7-011", as: "hybrid" }, "BT7-009", "BT7-010", "BT7-012"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("hybrid").instanceId));
    expect(player.deck).toHaveLength(3);
  });

  it("matches the exact Susanoomon name branch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-008", as: "source" }],
          deck: [{ card: "BT7-112", as: "susanoomon" }, "BT7-009", "BT7-010", "BT7-012"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("susanoomon").instanceId));

    expect(player.hand.some((c) => c.instanceId === s.inst("susanoomon").instanceId)).toBe(true);
  });
});
