import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Face-down ACE Discord arena scenario", () => {
  it("Discord bug 1557475629010518016: deleting a host with a face-down ACE source costs no Overflow", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoOrderTriggers: true });
    layDevScenario("arena-face-down-ace-no-overflow", s.state, [BLUE_DECK, RED_DECK]);
    void s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-face-down-ace-host",
        target: { kind: "permanent", permanentId: "dev-perm-1-face-down-ace-wall" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    const trashed = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trashed).toEqual(expect.arrayContaining(["dev-field-0-face-down-ace-host", "dev-face-down-ace-blitz"]));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
