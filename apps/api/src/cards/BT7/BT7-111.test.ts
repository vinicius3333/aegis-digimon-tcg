import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-111.js";

describe("BT7-111 Lucemon: Chaos Mode", () => {
  it("uses an exact Lucemon source for the alternate hand evolution", () => {
    expect(runtimeCompiledCard("BT7-111")?.digivolutionRequirement).toEqual([
      {
        namesExact: ["Lucemon"],
        cost: 7,
        isAlternate: true,
        sourceZones: ["hand"],
      },
    ]);
  });

  it("deletes an opponent Tamer on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT7-111", as: "source" }] },
        1: {
          battleArea: [{ card: "BT7-085", as: "targetTamer" }],
        },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 14;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => opponent.battleArea.length === 0);
    expect(opponent.trash.some((c) => c.cardId === "BT7-085")).toBe(true);
  });
});
