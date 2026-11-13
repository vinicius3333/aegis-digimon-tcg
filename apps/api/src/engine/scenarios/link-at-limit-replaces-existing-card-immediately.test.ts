import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/link-at-limit-replaces-existing-card-immediately.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";

it("trashes the existing link card as the new one links, before the effect continues", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true });
  s.state.phase = Phase.Main;
  await s.ready();
  const kyubimon = s.perm("kyubimon");
  const offensivePlugIn = s.inst("offensivePlugIn").instanceId;
  const highSpeedPlugIn = s.inst("highSpeedPlugIn").instanceId;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: offensivePlugIn })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision === undefined);

  expect(kyubimon.linked.map((card) => card.instanceId)).toEqual([offensivePlugIn]);
  expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(highSpeedPlugIn);
  expect(kyubimon.currentDP).toBe(8000);
  expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-059"]);
});
