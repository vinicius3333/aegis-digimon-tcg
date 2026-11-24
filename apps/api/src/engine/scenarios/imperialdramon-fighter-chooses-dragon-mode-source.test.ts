import { afterEach, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/imperialdramon-fighter-chooses-dragon-mode-source.fixture";
import "#api/cards/BT12/BT12-030";
import "#api/cards/BT12/BT12-031";
import "#api/cards/BT3/BT3-031";

type Scenario = ReturnType<typeof setupScenario>;

let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

function candidatesOf(s: Scenario) {
  return (JSON.parse(s.state.pendingDecision!.payloadJson || "{}") as { candidateInstanceIds?: string[] })
    .candidateInstanceIds;
}

function respond(s: Scenario, response: object) {
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: response as never,
    }),
  ).toEqual({ ok: true });
}

async function nextDecision(s: Scenario, kind: string) {
  await settle(() => s.state.pendingDecision?.seat === 0 && s.state.pendingDecision.kind === kind);
}

it.each(["dragonModeBt12", "dragonModeBt3"])(
  "Fighter Mode lets the player choose %s as the Dragon Mode source it returns",
  async (chosen) => {
    const s = setupScenario(fixture);
    const loop = s.engine.startTurnLoop();
    cleanup = async () => {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    };
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const memoryBeforeAttack = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dragon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await nextDecision(s, "optional");
    expect(JSON.parse(s.state.pendingDecision!.payloadJson).effectKey).toMatch(/^BT12-030\//);
    respond(s, { kind: "optional", accept: true });

    await nextDecision(s, "optional");
    expect(s.perm("dragon").topCard.instanceId).toBe(s.inst("fighter").instanceId);
    respond(s, { kind: "optional", accept: true });
    await nextDecision(s, "selectCards");
    expect(candidatesOf(s)?.toSorted()).toEqual(
      [s.inst("dragonModeBt12").instanceId, s.inst("dragonModeBt3").instanceId].toSorted(),
    );
    respond(s, { kind: "selectCards", instanceIds: [s.inst(chosen).instanceId] });

    const kept = chosen === "dragonModeBt12" ? "dragonModeBt3" : "dragonModeBt12";
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.engine.mainVerbContinuationsInFlight === 0 &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst(chosen).instanceId),
    );
    const fighter = s.perm("dragon");
    expect(fighter.stack.map((card) => card.instanceId)).toContain(s.inst(kept).instanceId);
    expect(fighter.stack.map((card) => card.instanceId)).not.toContain(s.inst(chosen).instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("sourceLess").instanceId);
    expect(s.state.memory).toBe(memoryBeforeAttack + 1);
  },
);
