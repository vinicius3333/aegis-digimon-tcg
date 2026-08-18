/**
 * The Test Seam. Arrange with a Board Spec, act through Intents, observe through named
 * affordances. `testkitSeam.guard.test.ts` fails the build on any engine reach-through
 * outside this directory.
 */
export {
  setupEngine,
  settle,
  findPermanent,
  assertNoLoudGap,
  makeInstance,
  makeDigimon,
  makeSecurityState,
  makeSecurityCard,
  type BoardSpec,
  type SeatSpec,
  type PermanentSpec,
  type CardSpec,
  type EngineSetup,
  type SetupEngineOptions,
} from "./harness.js";
export { observe } from "./observe.js";
export { advance } from "./advance.js";
