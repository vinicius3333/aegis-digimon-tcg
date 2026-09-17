import type { CardEffectsFixtureBuilder } from "../fixture";
import { appFusionDemo } from "./BT23-021";

export const bt23Fixtures: Record<string, CardEffectsFixtureBuilder> = {
  "BT23-021": () => appFusionDemo(),
};
