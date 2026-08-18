/**
 * Public surface of the bot package.
 *
 * `AegisRoom` needs only `BotPlayer`. Everything else is exported for the tournament
 * layer, which selects a personality per seat, and for the benchmark.
 */
export { BotPlayer, type BotOptions } from "./BotPlayer.js";
export {
  BOT_PROFILES,
  BOT_PROFILE_NAMES,
  DEFAULT_BOT_PROFILE,
  isBotProfileName,
  resolveBotProfile,
  type BotProfile,
  type BotProfileName,
  type BotWeights,
} from "./profiles.js";
export { createEvaluationPolicy, type BotPolicy } from "./policy.js";
export { createBaselinePolicy } from "./baselinePolicy.js";
export { buildBotView, type BotView } from "./view.js";
