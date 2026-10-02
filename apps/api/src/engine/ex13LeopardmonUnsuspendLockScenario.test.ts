import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

const LEOPARDMON = "dev-perm-1-leopardmon-lock-target";
const ATTACKER = "dev-perm-0-leopardmon-lock-attacker";

describe("EX13 Leopardmon unsuspend lock arena scenario", () => {
  it("Discord 1555307344550694942: a locked Leopardmon can't pay its unsuspend cost and is deleted", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex13-leopardmon-unsuspend-lock", s.state, [BLUE_DECK, RED_DECK]);
    const bot = s.state.players[1]!;
    const leopardmon = () => bot.battleArea.find(({ permanentId }) => permanentId === LEOPARDMON);

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-leopardmon-lock-mikemon" })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(leopardmon()!, "unsuspend"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(leopardmon()?.isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ATTACKER,
        target: { kind: "permanent", permanentId: LEOPARDMON },
      }),
    ).toEqual({ ok: true });
    await settle(() => leopardmon() === undefined && s.state.pendingDecision === undefined);

    expect(bot.battleArea).toHaveLength(0);
    expect(bot.trash.map(({ cardId }) => cardId)).toContain("EX13-043");
    expect(
      s.decisions.some(({ req }) => req.sourceCardId === "EX13-043" && /Prevent leaving/.test(req.promptText ?? "")),
    ).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
