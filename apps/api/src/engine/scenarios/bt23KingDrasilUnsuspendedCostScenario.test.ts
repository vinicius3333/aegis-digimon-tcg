import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

const KING_DRASIL = "dev-perm-0-king-drasil-cost";
const ULFORCE_CARD = "dev-king-drasil-cost-ulforce";
const UNSUSPEND_OPTION = 1;

describe("BT23 King Drasil unsuspended-cost arena", () => {
  it("Discord 1557169113896583198: King Drasil pays its suspend cost after Ulforce unsuspends it", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferTriggerKeys: ["EX13-023"],
        preferInstanceIds: ["dev-field-0-king-drasil-cost"],
        preferOptionIndex: UNSUSPEND_OPTION,
      },
    );
    layDevScenario("arena-bt23-king-drasil-unsuspended-cost", s.state, [BLUE_DECK, RED_DECK]);
    const kingDrasil = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === KING_DRASIL)!;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: KING_DRASIL, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle();
    expect(kingDrasil.isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ULFORCE_CARD })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && kingDrasil.isSuspended, 80);

    const ulforce = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === ULFORCE_CARD)!;
    expect(kingDrasil.isSuspended).toBe(true);
    expect(ulforce.isSuspended).toBe(false);
    for (const keyword of ["Rush", "Raid", "Reboot", "Blocker"] as const) {
      expect(observe(s.engine).hasKeyword(ulforce, keyword)).toBe(true);
    }
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
