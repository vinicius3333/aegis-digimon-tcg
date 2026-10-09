import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

it("GitHub #5370: real turn loop selects battle Mother Eater while breeding remains untouched", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
  layDevScenario("arena-bt22-akemi-battle-mother", s.state, [BLUE_DECK, RED_DECK]);
  const player = s.state.players[0]!;
  const mother = player.battleArea.find((p) => p.permanentId === "dev-perm-0-5370-battle")!;
  const other = player.battleArea.find((p) => p.permanentId === "dev-perm-0-5370-second")!;
  const akemi = player.battleArea.find((p) => p.topCard.cardId === "BT22-095")!;
  const breeding = player.breeding!;
  const breedingStack = breeding.stack.map((card) => card.instanceId);
  const existingStack = mother.stack.map((card) => card.instanceId);
  const akemiId = akemi.topCard.instanceId;
  const loop = s.engine.startTurnLoop();
  try {
    // Mother Eater has no DP and occupies breeding: hatch/move are impossible, so breeding auto-skips.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "phaseChanged", phase: Phase.Breeding, turnSeat: 0 }),
    );
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "phaseChanged", phase: Phase.Main, turnSeat: 0 }));
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.events.some((event) => event.kind === "turnEnded")).toBe(false);
    const effect = observe(s.engine).activatableEffects(akemi)[0]!;
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: akemiId, effectKey: effect.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const choice = s.decisions.at(-1)!.req;
    expect(choice.options?.candidateInstanceIds?.slice().sort()).toEqual(
      [mother.permanentId, other.permanentId].sort(),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [mother.permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => mother.stack.some((card) => card.instanceId === akemiId) && s.state.pendingDecision === undefined,
    );
    expect(mother.stack.map((card) => card.instanceId)).toEqual([akemiId, ...existingStack]);
    expect(breeding.stack.map((card) => card.instanceId)).toEqual(breedingStack);
    expect(player.breeding).toBe(breeding);
    expect(player.battleArea.some((p) => p.topCard.instanceId === akemiId)).toBe(false);
    expect(s.state.memory).toBe(3);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
