import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT12 Mikemon Discord arena scenario", () => {
  it("gains memory only when its own host deletes in battle (Discord 1555163238696484875)", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt12-mikemon-own-battle-only", s.state, [BLUE_DECK, RED_DECK]);
    const bot = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-mikemon-neighbor",
        target: { kind: "permanent", permanentId: "dev-perm-1-mikemon-first-target" },
      }),
    ).toEqual({ ok: true });
    await settle(() => bot.battleArea.length === 1 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-mikemon-host",
        target: { kind: "permanent", permanentId: "dev-perm-1-mikemon-second-target" },
      }),
    ).toEqual({ ok: true });
    await settle(() => bot.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
