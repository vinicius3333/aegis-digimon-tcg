import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("Discord 1558210190376050858 playable Publimon scenario", () => {
  it("returns Publimon to security only after its own attack", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-lm007-publimon-end-of-attack", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const [human, bot] = [s.state.players[0]!, s.state.players[1]!];

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-publimon-attacker",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        bot.battleArea.some((permanent) => permanent.topCard.cardId === "LM-007") &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(human.battleArea.map((permanent) => permanent.permanentId)).toEqual(["dev-perm-0-publimon-own"]);
    expect(human.security).toHaveLength(4);
    expect(bot.security.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-010", "BT1-010", "BT1-010"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-publimon-own",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => human.security.length === 5 && s.state.pendingDecision === undefined);
    expect(human.security[0]!.cardId).toBe("LM-007");
    expect(human.battleArea).toHaveLength(0);
    expect(bot.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["LM-007"]);
    expect(bot.security).toHaveLength(3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
