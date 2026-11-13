import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/trash-sources-may-choose-digimon-without-sources.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";

it("lets a trash-digivolution-cards effect choose an opponent's Digimon without sources (Q2007)", async () => {
  const s = setupScenario(fixture);
  s.state.phase = Phase.Main;
  await s.ready();
  const stacked = s.perm("stackedDigimon");
  const sourceless = s.perm("sourcelessDigimon");

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shellmon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  const trashChoice = s.state.pendingDecision!;
  expect(s.decisions.at(-1)?.req.options?.candidateInstanceIds).toEqual([stacked.permanentId, sourceless.permanentId]);

  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: trashChoice.decisionId,
      response: { kind: "chooseTargets", instanceIds: [sourceless.permanentId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision === undefined && observe(s.engine).isRestricted(sourceless, "block"));

  expect(stacked.stack).toHaveLength(3);
  expect(observe(s.engine).isRestricted(sourceless, "attack")).toBe(true);
  expect(observe(s.engine).isRestricted(stacked, "attack")).toBe(false);
});
