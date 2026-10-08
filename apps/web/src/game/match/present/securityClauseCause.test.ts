import { describe, expect, it } from "vitest";
import { createPresentationGate } from "../presentationGate";
import type { SecurityClause } from "../types";
import { securityClauseCausesBatch } from "./presentBatch";

function dockedClause(effectAtDock: SecurityClause["effectAtDock"]): SecurityClause {
  return {
    key: 1,
    gate: createPresentationGate(),
    releaseBoard: () => {},
    own: { notices: [], panels: [] },
    docking: false,
    effectAtDock,
  };
}

describe("securityClauseCausesBatch", () => {
  it("lets an unread security clause cause the batches that follow its dock", () => {
    const earlier = createPresentationGate();
    expect(securityClauseCausesBatch({ clause: dockedClause(earlier), latestAnnouncement: earlier })).toBe(true);
  });

  // effects-lab-prod-ghost: Phantomon's [On End of Attack] deletes it while the bot's
  // security card is still docking. The shatter must wait for Phantomon's clause.
  it("hands the cause to an effect announced after the card docked", () => {
    const earlier = createPresentationGate();
    const endOfAttack = createPresentationGate();
    expect(securityClauseCausesBatch({ clause: dockedClause(earlier), latestAnnouncement: endOfAttack })).toBe(false);
  });

  it("no longer causes anything once its clause has been read", () => {
    const earlier = createPresentationGate();
    const clause = dockedClause(earlier);
    clause.gate.release();
    expect(securityClauseCausesBatch({ clause, latestAnnouncement: earlier })).toBe(false);
  });
});
