export * from "./enums.js";
export * from "./CardInstance.js";
export * from "./Permanent.js";
export * from "./PlayerState.js";
export * from "./viewTags.js";
export * from "./GameState.js";

import { installSchemaCompat } from "./schemaCompat.js";
import { AppFusionRoute, CardInstance, DigivolveRoute, DnaDigivolveRoute } from "./CardInstance.js";
import { Permanent } from "./Permanent.js";
import { PlayerState, SecurityCardView } from "./PlayerState.js";
import { CombatWindow, GameState, PendingDecision } from "./GameState.js";

installSchemaCompat([
  AppFusionRoute,
  CardInstance,
  CombatWindow,
  DigivolveRoute,
  DnaDigivolveRoute,
  GameState,
  PendingDecision,
  Permanent,
  PlayerState,
  SecurityCardView,
]);
