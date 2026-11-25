import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/once-per-turn-resets-when-stack-moves-under-another-digimon.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import { advance } from "#api/engine/testkit/advance";
import { observe } from "#api/engine/testkit/observe";
import { internalsOf } from "#api/engine/testkit/internals";

type Scenario = ReturnType<typeof setupScenario>;

function gainMemoryEffect(s: Scenario, permanentAlias: string, sourceAlias: string) {
  return observe(s.engine)
    .activatableEffects(s.perm(permanentAlias))
    .find(
      (entry) => entry.instanceId === s.inst(sourceAlias).instanceId && /Gain 2 memory/i.test(entry.description ?? ""),
    );
}

async function activateGainMemory(s: Scenario, permanentAlias: string, sourceAlias: string): Promise<void> {
  const effect = gainMemoryEffect(s, permanentAlias, sourceAlias);
  expect(effect).toBeDefined();
  const memoryBefore = s.state.memory;
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.inst(sourceAlias).instanceId,
      effectKey: effect!.effectKey,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.memory === memoryBefore + 2);
  expect(s.state.memory).toBe(memoryBefore + 2);
}

async function startScenario(): Promise<Scenario> {
  const s = setupScenario(fixture, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: [],
  });
  s.state.phase = Phase.Main;
  await s.ready();
  return s;
}

it("resets a source's Once Per Turn use when its Digimon is placed under another Digimon", async () => {
  const s = await startScenario();
  await activateGainMemory(s, "placed", "movedLunamon");
  expect(gainMemoryEffect(s, "placed", "movedLunamon")).toBeUndefined();

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  await settle();

  const attackerStack = s.perm("attacker").stack.map((card) => card.instanceId);
  expect(attackerStack).toContain(s.inst("movedLunamon").instanceId);
  expect(s.state.players[0]!.battleArea).toHaveLength(1);

  await activateGainMemory(s, "attacker", "movedLunamon");
  await activateGainMemory(s, "attacker", "keptLunamon");

  expect(
    observe(s.engine)
      .activatableEffects(s.perm("attacker"))
      .filter((entry) => /Gain 2 memory/i.test(entry.description ?? "")),
  ).toHaveLength(0);
  expect(s.state.pendingDecision).toBeUndefined();
});

it("resets a source's Once Per Turn use when the source alone moves under another Digimon", async () => {
  const s = await startScenario();
  await activateGainMemory(s, "attacker", "keptLunamon");
  expect(gainMemoryEffect(s, "attacker", "keptLunamon")).toBeUndefined();

  await internalsOf(s.engine).primitives.placeUnder(s.perm("placed").permanentId, [s.inst("keptLunamon").instanceId]);

  await activateGainMemory(s, "placed", "keptLunamon");
});

it("keeps a source's Once Per Turn use when it is placed back under the same Digimon", async () => {
  const s = await startScenario();
  await activateGainMemory(s, "attacker", "keptLunamon");

  await internalsOf(s.engine).primitives.placeUnder(s.perm("attacker").permanentId, [s.inst("keptLunamon").instanceId]);

  expect(s.perm("attacker").stack.map((card) => card.instanceId)).toContain(s.inst("keptLunamon").instanceId);
  expect(gainMemoryEffect(s, "attacker", "keptLunamon")).toBeUndefined();
});
