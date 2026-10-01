import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

/**
 * Suspend the Unique Emblem's named Tamer so the Emblem's ＜Delay＞ offers to digivolve `base`
 * into `candidate` from hand. Returns the card on top of `base` afterwards.
 */
export async function emblemDelayDigivolution(emblem: string, tamer: string, base: string, candidate: string) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: emblem, as: "emblem" },
          { card: tamer, as: "tamer" },
          { card: base, as: "base" },
        ],
        hand: [{ card: candidate, as: "candidate" }],
        deck: ["BT1-010"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 3;
  await s.ready();

  await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
  await settle(() => s.state.pendingDecision === undefined);

  return s.perm("base").topCard.cardId;
}
