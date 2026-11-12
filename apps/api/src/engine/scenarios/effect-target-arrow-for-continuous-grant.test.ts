import type { ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";

const TAKUMI_AIBA = "BT5-091";
const LEVEL_3_DIGIMON = "BT1-009";

function targetEventsOf(events: readonly ServerEvent[]) {
  return events.filter((event) => event.kind === "effectTargetsSelected");
}

describe("effect target arrow for a continuous granted effect", () => {
  it("does not announce Takumi Aiba's always-on grant while the opponent plays and attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: TAKUMI_AIBA, as: "takumi" }], security: 3 },
      1: {
        battleArea: [{ card: LEVEL_3_DIGIMON, as: "attacker" }],
        hand: [{ card: LEVEL_3_DIGIMON, as: "played" }],
        security: 3,
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 5;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    const memoryAfterPlay = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended && s.state.memory === memoryAfterPlay - 1, 400);

    expect(s.state.memory).toBe(memoryAfterPlay - 1);
    expect(targetEventsOf(s.events)).toEqual([]);
  });
});
