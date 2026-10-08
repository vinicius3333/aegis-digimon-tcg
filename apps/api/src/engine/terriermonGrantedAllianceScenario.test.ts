import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

it.each([true, false])("Discord 1557815584748601454 arena: accept inherited evolution = %s", async (accept) => {
  const preferred: string[] = [];
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: accept,
      autoDeclineOptional: !accept,
      autoSelectCards: true,
      preferInstanceIds: preferred,
    },
  );
  layDevScenario("arena-terriermon-granted-alliance", s.state, [BLUE_DECK, RED_DECK]);
  const host = s.state.players[0]!.battleArea[0]!;
  const lopmon = s.state.players[0]!.battleArea[1]!;
  preferred.push(host.permanentId);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const effects = JSON.parse(lopmon.activatableEffectsJson) as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: lopmon.topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.keywords.includes("Alliance") && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: host.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: lopmon.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(host.topCard.cardId).toBe(accept ? "BT17-049" : "BT1-073");
    expect(lopmon.isSuspended).toBe(true);
    expect(s.state.memory).toBe(accept ? 8 : 10);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.events.filter((event) => event.kind === "digivolved")).toHaveLength(accept ? 1 : 0);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
