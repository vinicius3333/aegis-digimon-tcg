p = "apps/web/src/game/screen/hooks/useOverlayState.ts"
s = open(p).read()
s = s.replace(
    '''import type { AssemblyRequirement, DecisionRequest, DigiXrosRequirement, GameState } from "@aegis/shared";
import type { AssemblyCandidate, DigiXrosCandidate, DigiXrosEligibleExpander } from "../../overlay";
import type { EvoCostOption } from "../../boardModel";
import type { Side } from "../../side";
import type { PendingActionConfirmation } from "../types";''',
    '''import type { DecisionRequest, GameState } from "@aegis/shared";
import type { Side } from "../../side";
import type {
  AppFusionChoice,
  AssemblyPick,
  CardMenuAnchor,
  DigiXrosPick,
  DualPlayChoice,
  EvoCostChoice,
  PendingActionConfirmation,
} from "../types";''',
)
s = s.replace(
    '  const [cardMenu, setCardMenu] = useState<{ permanentId: string; side: Side; x: number; y: number } | null>(null);',
    "  const [cardMenu, setCardMenu] = useState<CardMenuAnchor | null>(null);",
)
s = s.replace(
    '  const [dualPlay, setDualPlay] = useState<{ instanceId: string; cardId: string } | null>(null);',
    "  const [dualPlay, setDualPlay] = useState<DualPlayChoice | null>(null);",
)
s = s.replace(
    """  const [assemblyPick, setAssemblyPick] = useState<{
    instanceId: string;
    cardId: string;
    requirement: AssemblyRequirement;
    candidates: AssemblyCandidate[];
  } | null>(null);""",
    "  const [assemblyPick, setAssemblyPick] = useState<AssemblyPick | null>(null);",
)
s = s.replace(
    """  const [evoCostChoice, setEvoCostChoice] = useState<{
    handInstanceId: string;
    permanentId: string;
    handCardId: string;
    baseName: string;
    options: EvoCostOption[];
  } | null>(null);""",
    "  const [evoCostChoice, setEvoCostChoice] = useState<EvoCostChoice | null>(null);",
)
s = s.replace(
    """  const [digiXrosPick, setDigiXrosPick] = useState<{
    instanceId: string;
    cardId: string;
    requirements: DigiXrosRequirement[];
    candidates: DigiXrosCandidate[];
    lockedCandidates: DigiXrosCandidate[];
    eligibleExpanders: DigiXrosEligibleExpander[];
    intrinsicTrashMax: number;
  } | null>(null);""",
    "  const [digiXrosPick, setDigiXrosPick] = useState<DigiXrosPick | null>(null);",
)
s = s.replace(
    """  const [appFusionChoice, setAppFusionChoice] = useState<{
    handInstanceId: string;
    hostPermanentId: string;
  } | null>(null);""",
    "  const [appFusionChoice, setAppFusionChoice] = useState<AppFusionChoice | null>(null);",
)
open(p, "w").write(s)


p = "apps/web/src/game/GameScreen.tsx"
s = open(p).read()

start = s.index("  // ----- intent senders (no-op safely if the room dropped) -----\n")
end = s.index("  const { blockWindow, counterWindow, allianceWindow, evadeWindow, barrierWindow, markCombatWindowAnswered } =")
new = """  const selection = { clearSel, setHandSel, setHandPreview, setSelPerm, setVortexMode, setLinkSel };
  const overlayControls = {
    setCardMenu,
    setStackView,
    setPicks,
    setDualPlay,
    setActionConfirm,
    setAssemblyPick,
    setDigiXrosPick,
    setEvoCostChoice,
  };
  const {
    dispatchPlayCard,
    playCard,
    beginLink,
    linkCard,
    digivolve,
    attack,
    respondDecision,
    respondMulligan,
    activateEffect,
    digivolveWithChoice,
  } = matchIntents({
    room,
    respondDecisionLocally: demoConnection?.respondDecision,
    decision,
    acknowledgeDecision,
    events,
    viewer: you,
    opponent: opp,
    handEntries,
    digivolveRoutesOf,
    mainActionBlocked,
    actionConfirmationsEnabled,
    playGameCue,
    lastPlayAttemptRef,
    playAttemptEventSeqRef,
    setOptimisticPlayedInstanceId,
    selection,
    overlays: overlayControls,
  });

"""
s = s[:start] + new + s[end:]
s = s.replace(
    'import { useTrackingArrow } from "./screen/hooks/useTrackingArrow";',
    'import { useTrackingArrow } from "./screen/hooks/useTrackingArrow";\n'
    'import { matchIntents } from "./screen/matchIntents";',
    1,
)
open(p, "w").write(s)
print("ok")
