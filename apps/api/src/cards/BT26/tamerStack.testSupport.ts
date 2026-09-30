import { expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { stackIds } from "../ST24/tamerStack.testSupport.js";

export { identityVisibility, stackIds, trashBottomTamerCardWithFalcomon } from "../ST24/tamerStack.testSupport.js";

export interface StartOfMainPlacement {
  s: EngineSetup;
  placedId: string;
  priorIds: string[];
  /** Surrender and let the turn loop finish. */
  finish(): Promise<void>;
}

/**
 * Seat `tamerCardId` with two face-down cards already under it, hand seat 0 one `handCardId`,
 * and run the turn loop into seat 0's Main phase so the Tamer's [Start of Your Main Phase]
 * effect pays its cost of placing that hand card face down under the Tamer.
 */
export async function placeAtStartOfMain(
  tamerCardId: string,
  handCardId: string,
  extra: BoardSpec = {},
): Promise<StartOfMainPlacement> {
  const s = setupEngine(
    {
      0: {
        ...extra[0],
        battleArea: [
          {
            card: tamerCardId,
            as: "tamer",
            under: [
              { card: "BT1-001", as: "priorBottom", faceUp: false },
              { card: "BT1-002", as: "priorTop", faceUp: false },
            ],
          },
          ...(extra[0]?.battleArea ?? []),
        ],
        hand: [{ card: handCardId, as: "placed" }, ...(extra[0]?.hand ?? [])],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { deck: ["BT1-013", "BT1-014"], ...extra[1] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 0;
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  const placedId = s.inst("placed").instanceId;
  const priorIds = [s.inst("priorBottom").instanceId, s.inst("priorTop").instanceId];
  expect(stackIds(s.perm("tamer"))).toEqual([placedId, ...priorIds]);
  return {
    s,
    placedId,
    priorIds,
    async finish() {
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  };
}
