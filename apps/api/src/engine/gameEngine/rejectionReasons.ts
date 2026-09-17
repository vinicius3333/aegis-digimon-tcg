import type { RejectReason } from "@aegis/shared";
import type { BreedingRejection } from "../actions/breeding.js";
import type {
  AssemblyRejection,
  DigiXrosRejection,
  DigivolveRejection,
  DnaDigivolveRejection,
  LinkCardRejection,
  PlayCardRejection,
} from "../actions/index.js";

/** Map play-card internal rejection reasons to client-surfaceable RejectReason codes. */
export function mapPlayCardReason(reason: PlayCardRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "insufficient-memory":
      return "insufficient-memory";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "not-playable-kind":
      return "not-playable-kind";
    case "no-empty-slot":
      return "no-empty-slot";
    case "play-prohibited":
      return "play-prohibited";
    case "color-requirement-unmet":
      return "color-requirement-unmet";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map DigiXros internal rejection reasons to client-surfaceable RejectReason codes. */
export function mapDigiXrosReason(reason: DigiXrosRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "insufficient-memory":
      return "insufficient-memory";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "not-playable-kind":
      return "not-playable-kind";
    case "not-digixros":
      return "not-digixros";
    case "no-materials":
      return "no-materials";
    case "invalid-material":
      return "invalid-material";
    case "invalid-expander":
      return "invalid-expander";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map Assembly internal rejection reasons to client-surfaceable RejectReason codes. */
export function mapAssemblyReason(reason: AssemblyRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "insufficient-memory":
      return "insufficient-memory";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "not-playable-kind":
      return "not-playable-kind";
    case "not-assembly":
      return "not-assembly";
    case "no-materials":
      return "no-materials";
    case "invalid-material":
      return "invalid-material";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map breeding internal rejection reasons to client-surfaceable RejectReason codes. */
export function mapBreedingReason(reason: BreedingRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "breeding-occupied":
      return "breeding-occupied";
    case "egg-deck-empty":
      return "egg-deck-empty";
    case "breeding-empty":
      return "breeding-empty";
    case "not-movable":
      return "not-movable";
    case "move-prohibited":
      return "move-prohibited";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map digivolve internal rejection reasons to client-surfaceable RejectReason codes. */
export function mapDigivolveReason(reason: DigivolveRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "invalid-evolution":
      return "invalid-evolution";
    case "insufficient-memory":
      return "insufficient-memory";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "no-such-permanent":
      return "no-such-permanent";
    case "not-controller":
      return "not-controller";
    case "not-a-digimon":
      return "not-a-digimon";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map dnaDigivolve internal rejection reasons to client-surfaceable RejectReason codes. */
export function mapDnaDigivolveReason(reason: DnaDigivolveRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "invalid-evolution":
      return "invalid-evolution";
    case "insufficient-memory":
      return "insufficient-memory";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "no-such-permanent":
      return "no-such-permanent";
    case "not-controller":
      return "not-controller";
    case "not-a-digimon":
      return "not-a-digimon";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map linkCard internal rejection reasons to client-surfaceable RejectReason codes. */
export function mapLinkReason(reason: LinkCardRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "not-linkable":
      return "not-linkable";
    case "no-such-permanent":
      return "no-such-permanent";
    case "not-controller":
      return "not-controller";
    case "link-requirement-unmet":
      return "link-requirement-unmet";
    case "insufficient-memory":
      return "insufficient-memory";
    case "no-such-player":
    case "game-over":
    case "illegal-target":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}
