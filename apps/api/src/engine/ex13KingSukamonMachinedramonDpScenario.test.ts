import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

const TARGET = "kingsukamon-machinedramon-target";

describe("EX13 KingSukamon vs Machinedramon arena scenario", () => {
  it("Discord 1555271931203158056: rewrites Machinedramon to a white 3000 DP [Sukamon]", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex13-kingsukamon-machinedramon-dp", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const target = () => s.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === TARGET)!;
    expect(target().currentDP).toBe(11000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-kingsukamon-machinedramon-king" })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === "dev-kingsukamon-machinedramon-fee"),
    );

    expect(observe(s.engine).effectiveNames(target())).toEqual(["sukamon"]);
    expect(observe(s.engine).effectiveColors(target())).toEqual(["White"]);
    expect(target().currentDP).toBe(3000);
    expect(target().originalDPOverride).toBe(3000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
