import type { CardEffectsFixtureBuilder } from "./fixture";
import { bt1Fixtures } from "./BT1";
import { bt2Fixtures } from "./BT2";
import { bt23Fixtures } from "./BT23";
import { bt3Fixtures } from "./BT3";
import { bt4Fixtures } from "./BT4";
import { bt5Fixtures } from "./BT5";
import { bt6Fixtures } from "./BT6";
import { ex3Fixtures } from "./EX3";

export const cardEffectsFixtures: Record<string, CardEffectsFixtureBuilder> = {
  ...bt1Fixtures,
  ...bt2Fixtures,
  ...bt23Fixtures,
  ...bt3Fixtures,
  ...bt4Fixtures,
  ...bt5Fixtures,
  ...bt6Fixtures,
  ...ex3Fixtures,
};
