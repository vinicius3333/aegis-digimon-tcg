/* Every presentation gate waits under a ceiling, and every ceiling is a safety net over a
   beat that was supposed to be handed over by name. When one fires, the viewer sits through
   it with the board held at an older revision — the security-check freeze was a blow gate
   that ran out its 45 seconds because the check that owned it had already been superseded.

   Nothing about that shows up as a failing assertion: the test passes, a little slower. So
   the ceiling is made loud here instead, for every test in the suite. */

import { afterEach, beforeEach } from "vitest";
import { observeGateExpiry, type GateExpiry } from "../src/game/match/presentationGate";

/**
 * A gate a test built to run its ceiling out on purpose. Only the ceiling's own tests
 * label their gates this way; no cue in the product does, so nothing real can opt out.
 */
const FIXTURE_LABEL_PREFIX = "test/";

let expiries: GateExpiry[] = [];
let stop: (() => void) | undefined;

beforeEach(() => {
  expiries = [];
  stop = observeGateExpiry((expiry) => {
    if (!expiry.label.startsWith(FIXTURE_LABEL_PREFIX)) expiries.push(expiry);
  });
});

afterEach(() => {
  stop?.();
  stop = undefined;
  if (expiries.length === 0) return;
  const ran = expiries.map(({ label, ceilingMs }) => `${label} ran out its ${ceilingMs}ms ceiling`);
  throw new Error(
    `A presentation gate was rescued by its ceiling instead of being released:\n  ${ran.join("\n  ")}\n` +
      "Release the gate from every path that ends the beat.",
  );
});
