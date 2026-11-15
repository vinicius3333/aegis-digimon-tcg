import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import base from "#api/engine/scenarios/sealed-color-and-breeding.fixture";
import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  ...base,
  name: "sealed-rookie-placement",
  rulesPolicy: GameRulesPolicy.SEALED.value,
};
export default fixture;
