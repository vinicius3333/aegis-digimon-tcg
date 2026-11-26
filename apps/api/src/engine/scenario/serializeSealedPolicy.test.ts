import { expect, it } from "vitest";
import { serializeScenarioFixture } from "#api/engine/scenario/serialize";
import fixture from "#api/engine/scenarios/sealed-rookie-placement.fixture";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";

it("retains the immutable sealed policy in portable scenario and replay preparation", () => {
  expect(serializeScenarioFixture(fixture).rulesPolicy).toBe(GameRulesPolicy.SEALED.value);
});
