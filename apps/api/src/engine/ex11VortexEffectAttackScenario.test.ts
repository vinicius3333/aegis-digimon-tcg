import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const AGUMON = "dev-perm-0-vortex-effect-attack-agumon";
const LILLYMON = "dev-perm-0-vortex-effect-attack-lillymon";
const VORTEXDRAMON = "dev-perm-0-vortex-effect-attack-vortexdramon";
const TARGET = "dev-perm-1-vortex-effect-attack-target";

describe("EX11 Vortexdramon effect-attack arena scenario", () => {
  it("Discord 1557002713047502968: a declined battle in an effect attack triggers again on the Alliance suspension", async () => {
    // Both Vortexdramon prompts open back to back after the Alliance choice, so the decline list
    // empties itself once it has refused the first one.
    const declinedPrompts = Object.assign(["Battle"], {
      some(this: string[], predicate: (prompt: string) => boolean): boolean {
        const refused = Array.prototype.some.call(this, predicate);
        if (refused) this.length = 0;
        return refused;
      },
    });
    const preferred = [AGUMON, "player", LILLYMON, TARGET];
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: declinedPrompts,
        preferInstanceIds: preferred,
      },
    );
    layDevScenario("arena-ex11-vortex-effect-attack", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const vortexdramon = () => human.battleArea.find(({ permanentId }) => permanentId === VORTEXDRAMON)!;
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    const battlePrompts = () =>
      s.decisions.filter(({ req }) => req.sourceCardId === "EX11-074" && req.promptText === "Battle").length;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: AGUMON,
        instanceId: "dev-vortex-effect-attack-togemon",
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision, 5000);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: LILLYMON })).toEqual({ ok: true });
    await settle(() => !bot.battleArea.some(({ permanentId }) => permanentId === TARGET), 5000);

    expect(declinedPrompts).toHaveLength(0);
    expect(battlePrompts()).toBe(2);
    expect(vortexdramon().isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
